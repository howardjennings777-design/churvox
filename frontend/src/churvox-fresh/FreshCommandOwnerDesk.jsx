import React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "./freshReviewActionForms.css";

function itemId(item) { return item?.id || item?._id || ""; }
function payloadOf(item) { return item?.payload && typeof item.payload === "object" ? item.payload : {}; }
function actionOf(item) { return String(item?.action || "").toLowerCase(); }
function categoryOf(item) { return String(item?.category || item?.action || "other").toLowerCase(); }

function titleCaseName(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function moneyValue(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? String(n.toFixed(0)) : "";
}

function dateValue(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" });
}

function parseNameFromText(text) {
  const raw = String(text || "");
  const patterns = [
    /^\s*(?:job|quote|invoice)\s+(?:for\s+)?([A-Za-z][A-Za-z' -]{1,60}?)(?=\s+(?:lawn|lawnmowing|mow|mowing|hedge|clean|cleaning|paint|painting|at|\d|\$|weekly|fortnight|fortnightly|monthly|next|tomorrow|today)\b|[,.;]|$)/i,
    /\bfor\s+([A-Za-z][A-Za-z' -]{1,60}?)(?=\s+(?:at|lawn|lawnmowing|mow|mowing|hedge|clean|cleaning|\d|\$|weekly|fortnight|fortnightly|monthly|next|tomorrow|today)\b|[,.;]|$)/i,
  ];

  for (const pattern of patterns) {
    const m = raw.match(pattern);
    if (m?.[1]) {
      return m[1]
        .replace(/\b(job|client|customer|lawn|mowing|mow|fortnightly|weekly|monthly)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  return "";
}

function parseRepeatFromText(text) {
  const raw = String(text || "").toLowerCase();
  if (/fortnight|every\s*2\s*weeks/.test(raw)) return "fortnightly";
  if (/weekly|every\s*week/.test(raw)) return "weekly";
  if (/monthly|every\s*month/.test(raw)) return "monthly";
  return "";
}

function parseWorkFromText(text) {
  const raw = String(text || "").toLowerCase();
  if (/lawn\s*mowing|lawnmowing|\bmow\b|mowing/.test(raw)) return "Lawn mowing";
  if (/hedge/.test(raw)) return "Hedge trimming";
  if (/clean|cleaning/.test(raw)) return "Cleaning";
  if (/paint|painting/.test(raw)) return "Painting";
  if (/pest/.test(raw)) return "Pest control";
  if (/plumb/.test(raw)) return "Plumbing";
  if (/electric/.test(raw)) return "Electrical";
  return "";
}

function parseCleanDateFromText(text) {
  const raw = String(text || "");
  const m = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i);
  if (m) {
    const day = m[1];
    const month = `${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}`;
    const year = new Date().getFullYear();
    return `${day} ${month} ${year}`;
  }
  return "";
}

function parseNotesFromText(text) {
  const raw = String(text || "");
  const explicit = raw.match(/\b(?:note|notes)\s*[:\-]\s*(.+)$/i);
  if (explicit?.[1]) return explicit[1].trim();
  const withNote = raw.match(/\bwith\s+(?:a\s+)?note\s+(?:that\s+)?(.+)$/i);
  if (withNote?.[1]) return withNote[1].trim();
  return "";
}

function cleanAiNote(value, original) {
  const note = String(value || "").trim();
  const raw = String(original || "").trim();
  if (!note) return "";
  if (note === raw) return "";
  if (raw && note.includes(raw)) return "";
  if (/^(job|create|add|prepare|move|invoice|quote|complete|change)\b/i.test(note)) return "";
  return note;
}

function genericText(value) {
  return /^(ai prepared admin work|review prepared from tell churvox|prepared admin action|new job: job to review|job to review)$/i.test(String(value || "").trim());
}

function actionLabel(action) {
  if (action === "create_job") return "Job approval form";
  if (action === "create_client") return "Client approval form";
  if (action === "create_quote") return "Quote approval form";
  if (action === "create_invoice" || action === "draft_invoice_from_job" || action === "batch_draft_invoices") return "Invoice approval form";
  if (action === "prepare_invoice_followups") return "Invoice follow-up form";
  if (action === "reschedule_job") return "Reschedule job form";
  if (action === "complete_job") return "Complete job form";
  if (action === "update_job_price") return "Price change form";
  return "Approval form";
}

function buildDraft(item) {
  const p = payloadOf(item);
  const original = item?.original_text || "";
  const action = actionOf(item);
  const customer = titleCaseName(p.customer_name || p.client_name || p.name || parseNameFromText(original) || "");
  const work = parseWorkFromText(original) || p.job_description || p.description || p.title || "";
  const cleanDate = parseCleanDateFromText(original) || p.scheduled_date_human || dateValue(p.scheduled_date || p.date) || "";
  const repeat = p.repeat || p.recurrence || parseRepeatFromText(original);

  return {
    action,
    customer_name: customer,
    client_name: customer,
    address: p.address || "",
    job_title: work,
    job_type: p.job_type || "lawn_mowing",
    price: moneyValue(p.price || p.amount || p.subtotal || p.total),
    old_price: moneyValue(p.old_price || p.current_price),
    new_price: moneyValue(p.new_price || p.price || p.amount),
    scheduled_date_human: cleanDate,
    current_date: p.current_date || p.current_scheduled_date || "",
    new_date: p.new_date || cleanDate,
    repeat,
    email: p.email || p.customer_email || "",
    phone: p.phone || "",
    quote_description: p.job_description || p.description || work || "",
    invoice_description: p.description || p.job_description || work || "",
    line_item: p.line_item || p.description || work || "",
    subtotal: moneyValue(p.subtotal || p.price || p.amount),
    gst: moneyValue(p.gst),
    total: moneyValue(p.total || p.price || p.amount),
    due_date: p.due_date || "",
    invoice_number: p.invoice_number || "",
    amount_owing: moneyValue(p.amount_owing || p.balance || p.total),
    message: p.message || p.message_text || "",
    completed_date: p.completed_date || cleanDate || dateValue(new Date()),
    worker_name: p.worker_name || p.worker || "",
    time_logged: p.time_logged || p.duration || "",
    reason: p.reason || "",
    notes: cleanAiNote(p.notes, original) || parseNotesFromText(original),
    original,
  };
}

function draftToPayload(item, draft) {
  const existing = payloadOf(item);
  const action = actionOf(item);

  if (action === "create_client") {
    return { ...existing, name: draft.customer_name, customer_name: draft.customer_name, email: draft.email, phone: draft.phone, address: draft.address, notes: draft.notes };
  }

  if (action === "create_quote") {
    return { ...existing, customer_name: draft.customer_name, client_name: draft.customer_name, address: draft.address, job_description: draft.quote_description, description: draft.quote_description, price: Number(draft.price || 0), amount: Number(draft.price || 0), gst: Number(draft.gst || 0), notes: draft.notes };
  }

  if (action === "create_invoice" || action === "draft_invoice_from_job" || action === "batch_draft_invoices") {
    return { ...existing, customer_name: draft.customer_name, client_name: draft.customer_name, address: draft.address, description: draft.invoice_description, line_item: draft.line_item, subtotal: Number(draft.subtotal || draft.price || 0), gst: Number(draft.gst || 0), total: Number(draft.total || draft.subtotal || 0), due_date: draft.due_date, notes: draft.notes };
  }

  if (action === "prepare_invoice_followups") {
    return { ...existing, customer_name: draft.customer_name, invoice_number: draft.invoice_number, amount_owing: Number(draft.amount_owing || 0), message: draft.message, notes: draft.notes };
  }

  if (action === "reschedule_job") {
    return { ...existing, customer_name: draft.customer_name, address: draft.address, current_date: draft.current_date, new_date: draft.new_date, scheduled_date_human: draft.new_date, reason: draft.reason, notes: draft.notes };
  }

  if (action === "complete_job") {
    return { ...existing, customer_name: draft.customer_name, address: draft.address, completed_date: draft.completed_date, worker_name: draft.worker_name, time_logged: draft.time_logged, notes: draft.notes };
  }

  if (action === "update_job_price") {
    return { ...existing, customer_name: draft.customer_name, address: draft.address, old_price: Number(draft.old_price || 0), current_price: Number(draft.old_price || 0), new_price: Number(draft.new_price || draft.price || 0), price: Number(draft.new_price || draft.price || 0), reason: draft.reason, notes: draft.notes };
  }

  return { ...existing, customer_name: draft.customer_name, client_name: draft.customer_name, title: draft.job_title, description: draft.job_title, job_description: draft.job_title, job_type: draft.job_type, address: draft.address, price: Number(draft.price || 0), amount: Number(draft.price || 0), scheduled_date_human: draft.scheduled_date_human, date: draft.scheduled_date_human, repeat: draft.repeat, recurrence: draft.repeat, email: draft.email, customer_email: draft.email, phone: draft.phone, notes: draft.notes };
}

function titleOf(item) {
  const p = payloadOf(item);
  const action = actionOf(item);
  const existing = item?.title || item?.summary;
  const customer = titleCaseName(p.customer_name || p.client_name || p.name || parseNameFromText(item?.original_text));
  if (existing && !genericText(existing)) return existing;
  if (action === "create_job") return `New job${customer ? ` for ${customer}` : ""}`;
  if (action === "create_client") return `New client${customer ? `: ${customer}` : ""}`;
  if (action === "create_quote") return `New quote${customer ? ` for ${customer}` : ""}`;
  if (action === "create_invoice" || action === "draft_invoice_from_job" || action === "batch_draft_invoices") return `Draft invoice${customer ? ` for ${customer}` : ""}`;
  if (action === "prepare_invoice_followups") return `Invoice follow-up${customer ? ` for ${customer}` : ""}`;
  if (action === "reschedule_job") return `Move job${customer ? ` for ${customer}` : ""}`;
  if (action === "complete_job") return `Complete job${customer ? ` for ${customer}` : ""}`;
  if (action === "update_job_price") return `Update price${customer ? ` for ${customer}` : ""}`;
  return item?.original_text ? `Review: ${String(item.original_text).slice(0, 70)}` : "Prepared admin action";
}

function summaryOf(item) {
  const p = payloadOf(item);
  const action = actionOf(item);
  const customer = titleCaseName(p.customer_name || p.client_name || p.name || parseNameFromText(item?.original_text));
  const bits = [customer, p.address, p.price || p.amount || p.subtotal || p.total ? `$${moneyValue(p.price || p.amount || p.subtotal || p.total)}` : "", p.scheduled_date_human || p.new_date || dateValue(p.scheduled_date || p.date), p.repeat || p.recurrence].filter(Boolean);
  if (bits.length) return bits.join(" · ");
  return action ? `${actionLabel(action)} waiting for owner approval.` : "Prepared for owner Review.";
}

function MoneyInput({ value, onChange, placeholder = "60" }) {
  return <div className="freshReviewMoneyInput"><i>$</i><input value={value} onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ""))} placeholder={placeholder} inputMode="decimal" /></div>;
}

function Field({ label, children, wide = false }) { return <label className={wide ? "wide" : ""}><span>{label}</span>{children}</label>; }

function JobReviewForm({ draft, setDraft }) {
  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  return <div className="freshReviewFormGrid"><Field label="Customer name"><input value={draft.customer_name} onChange={update("customer_name")} placeholder="Customer name" /></Field><Field label="Address / site"><input value={draft.address} onChange={update("address")} placeholder="Address missing — add before approval" /></Field><Field label="Job / work" wide><input value={draft.job_title} onChange={update("job_title")} placeholder="What work is being done?" /></Field><Field label="Price"><MoneyInput value={draft.price} onChange={(price) => setDraft((d) => ({ ...d, price }))} /></Field><Field label="Date"><input value={draft.scheduled_date_human} onChange={update("scheduled_date_human")} placeholder="18 Aug 2026" /></Field><Field label="Repeat"><select value={draft.repeat} onChange={update("repeat")}><option value="">One-off / not set</option><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option></select></Field><Field label="Notes" wide><textarea value={draft.notes} onChange={update("notes")} placeholder="Only notes Churvox found or you add here" /></Field></div>;
}

function ClientReviewForm({ draft, setDraft }) {
  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  return <div className="freshReviewFormGrid"><Field label="Client name"><input value={draft.customer_name} onChange={update("customer_name")} placeholder="Client name" /></Field><Field label="Phone"><input value={draft.phone} onChange={update("phone")} placeholder="021..." /></Field><Field label="Email"><input value={draft.email} onChange={update("email")} placeholder="email@example.com" /></Field><Field label="Address"><input value={draft.address} onChange={update("address")} placeholder="Client address" /></Field><Field label="Notes" wide><textarea value={draft.notes} onChange={update("notes")} placeholder="Client notes" /></Field></div>;
}

function QuoteReviewForm({ draft, setDraft }) {
  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  return <div className="freshReviewFormGrid"><Field label="Customer name"><input value={draft.customer_name} onChange={update("customer_name")} placeholder="Customer name" /></Field><Field label="Address / site"><input value={draft.address} onChange={update("address")} placeholder="Quote address" /></Field><Field label="Quote work" wide><textarea value={draft.quote_description} onChange={update("quote_description")} placeholder="What is quoted?" /></Field><Field label="Quote price"><MoneyInput value={draft.price} onChange={(price) => setDraft((d) => ({ ...d, price }))} /></Field><Field label="GST"><MoneyInput value={draft.gst} onChange={(gst) => setDraft((d) => ({ ...d, gst }))} placeholder="GST if needed" /></Field><Field label="Notes" wide><textarea value={draft.notes} onChange={update("notes")} placeholder="Quote notes" /></Field></div>;
}

function InvoiceReviewForm({ draft, setDraft }) {
  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  return <div className="freshReviewFormGrid"><Field label="Customer name"><input value={draft.customer_name} onChange={update("customer_name")} placeholder="Customer name" /></Field><Field label="Job / address"><input value={draft.address} onChange={update("address")} placeholder="Job or address" /></Field><Field label="Line item" wide><input value={draft.line_item} onChange={update("line_item")} placeholder="Invoice line item" /></Field><Field label="Subtotal"><MoneyInput value={draft.subtotal} onChange={(subtotal) => setDraft((d) => ({ ...d, subtotal }))} /></Field><Field label="GST"><MoneyInput value={draft.gst} onChange={(gst) => setDraft((d) => ({ ...d, gst }))} placeholder="GST" /></Field><Field label="Total"><MoneyInput value={draft.total} onChange={(total) => setDraft((d) => ({ ...d, total }))} /></Field><Field label="Due date"><input value={draft.due_date} onChange={update("due_date")} placeholder="Due date" /></Field><Field label="Notes" wide><textarea value={draft.notes} onChange={update("notes")} placeholder="Invoice stays draft until approved" /></Field></div>;
}

function FollowUpReviewForm({ draft, setDraft }) {
  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  return <div className="freshReviewFormGrid"><Field label="Customer name"><input value={draft.customer_name} onChange={update("customer_name")} placeholder="Customer name" /></Field><Field label="Invoice number"><input value={draft.invoice_number} onChange={update("invoice_number")} placeholder="Invoice number" /></Field><Field label="Amount owing"><MoneyInput value={draft.amount_owing} onChange={(amount_owing) => setDraft((d) => ({ ...d, amount_owing }))} /></Field><Field label="Message to send" wide><textarea value={draft.message} onChange={update("message")} placeholder="Follow-up message" /></Field><Field label="Notes" wide><textarea value={draft.notes} onChange={update("notes")} placeholder="Internal note" /></Field></div>;
}

function RescheduleReviewForm({ draft, setDraft }) {
  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  return <div className="freshReviewFormGrid"><Field label="Customer name"><input value={draft.customer_name} onChange={update("customer_name")} placeholder="Customer name" /></Field><Field label="Job / address"><input value={draft.address} onChange={update("address")} placeholder="Job address" /></Field><Field label="Current date"><input value={draft.current_date} onChange={update("current_date")} placeholder="Current date" /></Field><Field label="New date"><input value={draft.new_date} onChange={update("new_date")} placeholder="New date" /></Field><Field label="Reason" wide><textarea value={draft.reason} onChange={update("reason")} placeholder="Why move it?" /></Field></div>;
}

function CompleteJobReviewForm({ draft, setDraft }) {
  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  return <div className="freshReviewFormGrid"><Field label="Customer name"><input value={draft.customer_name} onChange={update("customer_name")} placeholder="Customer name" /></Field><Field label="Job / address"><input value={draft.address} onChange={update("address")} placeholder="Job address" /></Field><Field label="Completed date"><input value={draft.completed_date} onChange={update("completed_date")} placeholder="Completed date" /></Field><Field label="Worker"><input value={draft.worker_name} onChange={update("worker_name")} placeholder="Worker name" /></Field><Field label="Time logged"><input value={draft.time_logged} onChange={update("time_logged")} placeholder="Time logged" /></Field><Field label="Completion notes" wide><textarea value={draft.notes} onChange={update("notes")} placeholder="Completion notes" /></Field></div>;
}

function PriceChangeReviewForm({ draft, setDraft }) {
  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  return <div className="freshReviewFormGrid"><Field label="Customer name"><input value={draft.customer_name} onChange={update("customer_name")} placeholder="Customer name" /></Field><Field label="Job / address"><input value={draft.address} onChange={update("address")} placeholder="Job address" /></Field><Field label="Current price"><MoneyInput value={draft.old_price} onChange={(old_price) => setDraft((d) => ({ ...d, old_price }))} placeholder="Current" /></Field><Field label="New price"><MoneyInput value={draft.new_price} onChange={(new_price) => setDraft((d) => ({ ...d, new_price }))} placeholder="New" /></Field><Field label="Reason" wide><textarea value={draft.reason} onChange={update("reason")} placeholder="Reason for price change" /></Field></div>;
}

function ReviewFormRouter({ item, draft, setDraft }) {
  const action = actionOf(item);
  if (action === "create_client") return <ClientReviewForm draft={draft} setDraft={setDraft} />;
  if (action === "create_quote") return <QuoteReviewForm draft={draft} setDraft={setDraft} />;
  if (action === "create_invoice" || action === "draft_invoice_from_job" || action === "batch_draft_invoices") return <InvoiceReviewForm draft={draft} setDraft={setDraft} />;
  if (action === "prepare_invoice_followups") return <FollowUpReviewForm draft={draft} setDraft={setDraft} />;
  if (action === "reschedule_job") return <RescheduleReviewForm draft={draft} setDraft={setDraft} />;
  if (action === "complete_job") return <CompleteJobReviewForm draft={draft} setDraft={setDraft} />;
  if (action === "update_job_price") return <PriceChangeReviewForm draft={draft} setDraft={setDraft} />;
  return <JobReviewForm draft={draft} setDraft={setDraft} />;
}

function compactDetails(item) {
  const d = buildDraft(item);
  const rows = [];
  if (d.customer_name) rows.push(["Customer", d.customer_name]);
  if (d.address) rows.push(["Address", d.address]);
  if (d.price) rows.push(["Price", `$${d.price}`]);
  if (d.total) rows.push(["Total", `$${d.total}`]);
  if (d.scheduled_date_human) rows.push(["Date", d.scheduled_date_human]);
  if (d.repeat) rows.push(["Repeat", d.repeat]);
  return rows.slice(0, 6);
}

function FilledForm({ item, draft, setDraft }) {
  return <section className="freshReviewForm"><div className="freshReviewFormHead"><span>{actionLabel(actionOf(item))}</span><p>Check or edit this before approving. Churvox uses this exact form.</p></div><ReviewFormRouter item={item} draft={draft} setDraft={setDraft} /></section>;
}

function ReviewCard({ item, busy, onOpen, onApprove, onIgnore }) {
  return <article className={`freshReviewItem ${categoryOf(item)}`}><div><span>{categoryOf(item)}</span><em>{item?.created_at ? new Date(item.created_at).toLocaleString("en-NZ") : "backend"}</em></div><h3>{titleOf(item)}</h3><p>{summaryOf(item)}</p><div className="freshReviewMiniGrid">{compactDetails(item).map(([key, value]) => <section key={key}><b>{key}</b><p>{value}</p></section>)}</div><div className="freshActions"><button className="freshPrimary" type="button" onClick={() => onOpen(item)}>Open form</button><button className="freshGhost" type="button" disabled={busy} onClick={() => onApprove(item, "", draftToPayload(item, buildDraft(item)))}>Approve</button><button className="freshGhost" type="button" disabled={busy} onClick={() => onIgnore(item, "Ignored from Review.")}>Ignore</button></div></article>;
}

function ReviewModal({ item, busy, onClose, onSave, onApprove, onIgnore }) {
  const [draft, setDraft] = React.useState(buildDraft(item));
  React.useEffect(() => { setDraft(buildDraft(item)); }, [item]);
  if (!item || typeof document === "undefined") return null;
  const payload = draftToPayload(item, draft);

  return createPortal(<div className="freshPopupBackdrop freshReviewPopupBackdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="dialog" aria-modal="true"><section className="freshCard freshReviewPopupCard"><button className="freshReviewClose" type="button" onClick={onClose}>×</button><header className="freshHero freshReviewPopupHero"><span>Backend owner review</span><h1>{titleOf({ ...item, payload })}</h1><p>{summaryOf({ ...item, payload })}</p></header><div className="freshReviewPopupBody"><FilledForm item={item} draft={draft} setDraft={setDraft} /><section className="freshReviewSafe"><b>Safe rule</b><p>Nothing creates, sends, syncs, marks paid, or changes live records until you approve this form.</p></section><div className="freshActions freshReviewModalActions"><button className="freshPrimary" type="button" disabled={busy} onClick={() => onApprove(item, "", payload)}>{busy ? "Approving…" : "Approve backend action"}</button><button className="freshGhost" type="button" disabled={busy} onClick={() => onSave(item, "Saved edited approval form.", payload)}>Save form</button><button className="freshGhost" type="button" disabled={busy} onClick={() => onIgnore(item, "Ignored from Review.")}>Ignore</button></div></div></section></div>, document.body);
}

function Style() {
  return (
    <style>{`
      .freshReviewPage{display:grid;gap:16px}
      .freshReviewHero{border-radius:34px;background:radial-gradient(circle at top right,rgba(249,115,22,.24),transparent 34%),linear-gradient(135deg,#0b1220,#111827 48%,#1f2937);color:white;padding:28px;border-left:8px solid #f97316;box-shadow:0 24px 70px rgba(2,6,23,.20)}
      .freshReviewHero span{display:inline-flex;border-radius:999px;background:#fff7ed;color:#9a3412;padding:9px 13px;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em}
      .freshReviewHero h1{margin:13px 0 8px;color:white;font-size:clamp(38px,5vw,66px);line-height:.92;letter-spacing:-.06em}
      .freshReviewHero p{margin:0;color:#e5e7eb;font-weight:850;line-height:1.45}
      .freshReviewStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}
      .freshReviewStats div{border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);padding:13px}
      .freshReviewStats small{display:block;color:#fed7aa;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em}
      .freshReviewStats b{display:block;color:#fff;font-size:25px;margin-top:4px}
      .freshReviewToolbar{display:flex;flex-wrap:wrap;gap:8px}
      .freshReviewToolbar button{border:1px solid rgba(15,23,42,.12);border-radius:999px;background:#fffaf0;color:#101827;padding:10px 14px;font-weight:1000;cursor:pointer}
      .freshReviewToolbar button.active{background:#111827;color:white}
      .freshReviewList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .freshReviewItem{border:1px solid rgba(15,23,42,.12);border-left:7px solid #f97316;border-radius:28px;background:#fffaf0;padding:17px;box-shadow:0 16px 42px rgba(2,6,23,.08);display:grid;gap:11px}
      .freshReviewItem.money{border-left-color:#16a34a}.freshReviewItem.work{border-left-color:#2563eb}
      .freshReviewItem>div:first-child{display:flex;justify-content:space-between;gap:10px}.freshReviewItem span{border-radius:999px;background:#fff7ed;color:#9a3412;padding:7px 10px;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:1000}.freshReviewItem em{font-style:normal;color:#64748b;font-size:11px;font-weight:900}.freshReviewItem h3{margin:0;color:#101827;font-size:24px;line-height:1;letter-spacing:-.04em}.freshReviewItem p{margin:0;color:#475569;font-weight:850;line-height:1.4}
      .freshReviewMiniGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.freshReviewMiniGrid section{border:1px solid rgba(15,23,42,.10);border-radius:16px;background:#fff;padding:10px}.freshReviewMiniGrid b{display:block;color:#101827;font-size:12px;font-weight:1000}.freshReviewMiniGrid p{margin:4px 0 0;color:#475569;font-size:12px;font-weight:850;word-break:break-word}
      .freshReviewEmpty,.freshReviewError{border:1px dashed rgba(15,23,42,.18);border-radius:28px;background:#fffaf0;padding:26px;display:grid;gap:12px}.freshReviewEmpty h2,.freshReviewError h2{margin:0;color:#101827;font-size:30px;letter-spacing:-.04em}.freshReviewEmpty p,.freshReviewError p{margin:0;color:#475569;font-weight:850;max-width:780px}
      .freshReviewSafe{border:1px solid rgba(249,115,22,.22);border-radius:20px;background:#fff7ed;padding:13px}.freshReviewSafe b{color:#9a3412}.freshReviewSafe p{margin:5px 0 0;color:#475569;font-weight:850}
      .freshReviewClose{position:absolute;right:14px;top:14px;z-index:8;border:0;border-radius:999px;width:42px;height:42px;background:#111827;color:white;font-size:24px;font-weight:1000;cursor:pointer}
      @media(max-width:800px){.freshReviewStats,.freshReviewList,.freshReviewMiniGrid{grid-template-columns:1fr}.freshReviewHero{padding:22px}.freshReviewHero h1{font-size:42px}}
    `}</style>
  );
}

export default function FreshCommandOwnerDesk({ onNavigate }) {
  const { get, post, patch } = useApi();
  const [items, setItems] = React.useState([]);
  const [filter, setFilter] = React.useState("all");
  const [active, setActive] = React.useState(null);
  const [busyId, setBusyId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadItems = React.useCallback(async () => {
    setLoading(true); setError("");
    const res = await get("/ai-review-items", { timeout: 25000 });
    setLoading(false);
    if (!res?.success) { setItems([]); setError(res?.error || "Backend Review is not ready. No local fallback was loaded."); return; }
    const list = res?.data?.items || res?.items || [];
    const safeList = Array.isArray(list) ? [...list] : [];
    safeList.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
    setItems(safeList);
    try {
      const focusId = window.localStorage.getItem("churvox:last-ai-review-id:v1");
      if (focusId) {
        const found = safeList.find((item) => itemId(item) === focusId);
        if (found) { setFilter("all"); setActive(found); window.localStorage.removeItem("churvox:last-ai-review-id:v1"); }
      }
    } catch {}
  }, [get]);

  React.useEffect(() => { loadItems(); }, [loadItems]);
  React.useEffect(() => {
    const reload = () => loadItems();
    window.addEventListener("churvox:fresh-data-updated", reload);
    return () => window.removeEventListener("churvox:fresh-data-updated", reload);
  }, [loadItems]);

  async function savePayload(item, note, payload) {
    const id = itemId(item); if (!id) return false;
    const res = await patch(`/ai-review-items/${id}`, { note, payload }, { timeout: 25000 });
    if (!res?.success) { toast.error(res?.error || "Could not save Review form."); return false; }
    return true;
  }

  async function approveItem(item, note = "", payload = null) {
    const id = itemId(item); if (!id) return;
    setBusyId(id);
    if (payload) { const saved = await savePayload(item, note, payload); if (!saved) { setBusyId(""); return; } }
    const res = await post(`/ai-review-items/${id}/approve`, { note }, { timeout: 60000 });
    setBusyId("");
    if (!res?.success) { toast.error(res?.error || "Backend approval failed."); return; }
    toast.success("Approved. Backend executed the prepared work.");
    setActive(null); loadItems();
  }

  async function saveEdit(item, note = "", payload = null) {
    const id = itemId(item); if (!id) return;
    setBusyId(id);
    const saved = await savePayload(item, note, payload);
    setBusyId("");
    if (!saved) return;
    toast.success("Saved form in backend Review.");
    setActive(null); loadItems();
  }

  async function ignoreItem(item, note = "") {
    const id = itemId(item); if (!id) return;
    setBusyId(id);
    const res = await post(`/ai-review-items/${id}/ignore`, { note }, { timeout: 25000 });
    setBusyId("");
    if (!res?.success) { toast.error(res?.error || "Could not ignore item."); return; }
    toast.info("Ignored. Backend Review updated.");
    setActive(null); loadItems();
  }

  const waiting = items.length;
  const money = items.filter((item) => categoryOf(item) === "money").length;
  const work = items.filter((item) => categoryOf(item) === "work").length;
  const create = items.filter((item) => categoryOf(item) === "create").length;
  const visible = filter === "all" ? items : items.filter((item) => categoryOf(item) === filter);

  return <section className="freshReviewPage"><Style /><header className="freshReviewHero"><span>Owner Review</span><h1>Approve what Churvox prepared.</h1><p>Each Review item opens the right form for the action. Nothing changes until you approve.</p><div className="freshReviewStats"><div><small>Waiting</small><b>{loading ? "…" : waiting}</b></div><div><small>Money</small><b>{money}</b></div><div><small>Work</small><b>{work}</b></div><div><small>Create</small><b>{create}</b></div></div></header><div className="freshReviewToolbar">{["all", "money", "work", "create", "other"].map((key) => <button key={key} type="button" className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{key}</button>)}<button type="button" onClick={loadItems}>Reload backend Review</button></div>{error ? <section className="freshReviewError"><h2>Backend Review is not available.</h2><p>{error}</p><div className="freshActions"><button className="freshPrimary" type="button" onClick={() => onNavigate?.("quickcreateai")}>Back to Tell Churvox</button><button className="freshGhost" type="button" onClick={loadItems}>Retry backend</button></div></section> : loading ? <section className="freshReviewEmpty"><h2>Loading backend Review…</h2><p>Checking the business database for prepared work.</p></section> : waiting === 0 ? <section className="freshReviewEmpty"><h2>Nothing waiting for approval.</h2><p>Tell Churvox what happened and prepared backend work will appear here.</p><div className="freshActions"><button className="freshPrimary" type="button" onClick={() => onNavigate?.("quickcreateai")}>Tell Churvox</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("smart")}>Back to Today</button></div></section> : <section className="freshReviewList">{visible.map((item) => <ReviewCard key={itemId(item)} item={item} busy={busyId === itemId(item)} onOpen={setActive} onApprove={approveItem} onIgnore={ignoreItem} />)}</section>}<ReviewModal item={active} busy={busyId === itemId(active)} onClose={() => setActive(null)} onApprove={approveItem} onSave={saveEdit} onIgnore={ignoreItem} /></section>;
}
