import React from "react";
import { useApi } from "../hooks/useApi";

const REVIEW_KEY = "churvox:review-inbox:v1";
const OLD_REVIEW_KEY = "churvox:fresh-command-inbox:v1";

const ACTION_GROUPS = [
  {
    title: "Create",
    hint: "New records",
    actions: [
      ["add-job", "Add job", "bob 16 taita drive $60 repeat 23/07/09"],
      ["add-client", "Add client", "add client Sarah Johnson 027 555 1212 sarah@example.com 12 High Street"],
      ["add-quote", "Add quote", "quote Sarah hedge trim $180 at 12 High Street"],
      ["add-invoice", "Add invoice", "invoice Sarah hedge trim $120 due friday"],
      ["add-worker", "Add worker", "add worker Mike mike@example.com 021 555 999"],
    ],
  },
  {
    title: "Work",
    hint: "Live job changes",
    actions: [
      ["find-record", "Find record", "find Sarah"],
      ["move-job", "Move job", "move bob to next week"],
      ["complete-job", "Complete job", "mark bob complete"],
      ["update-price", "Update price", "change bob to $70"],
    ],
  },
  {
    title: "Money",
    hint: "Draft only",
    actions: [
      ["invoice-job", "Invoice job", "invoice bob completed job"],
      ["invoice-jobs", "Invoice jobs", "invoice completed jobs"],
      ["chase-invoices", "Chase invoices", "chase unpaid invoices"],
    ],
  },
];

const TYPE_LABEL = {
  job: "Job",
  client: "Client",
  quote: "Quote",
  invoice: "Invoice",
  person: "Worker",
};

const TARGET_PAGE = {
  job: "jobs",
  client: "clients",
  quote: "quotes",
  invoice: "invoices",
  person: "team",
};

const FIRST_EXAMPLE = ACTION_GROUPS[0].actions[0][2];

const groupGrid = { display: "grid", gap: 10, marginTop: 12 };
const groupBox = { border: "1px solid rgba(154,52,18,.16)", borderRadius: 18, background: "rgba(255,247,237,.72)", padding: 10 };
const groupHead = { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 };
const groupTitle = { color: "#101827", WebkitTextFillColor: "#101827", fontWeight: 1000, fontSize: 13 };
const groupHint = { color: "#9a3412", WebkitTextFillColor: "#9a3412", fontWeight: 1000, fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em" };
const pillBar = { display: "flex", flexWrap: "wrap", gap: 8 };
const pillButton = { border: 0, borderRadius: 999, minHeight: 38, padding: "0 13px", background: "#fff", color: "#9a3412", WebkitTextFillColor: "#9a3412", fontWeight: 1000, cursor: "pointer", boxShadow: "0 8px 22px rgba(154,52,18,.08)" };

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

function title(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? `$${n.toFixed(n % 1 ? 2 : 0)}` : "Price needed";
}

function amountOf(value) {
  const m = String(value || "").match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  return m ? Number(m[1]) : 0;
}

function addressOf(value) {
  const m = String(value || "").match(/\b\d{1,5}\s+[A-Za-z0-9'. -]+?\b(?:street|road|avenue|drive|lane|place|crescent|terrace|court|way|highway)\b/i);
  return m ? title(m[0]) : "";
}

function emailOf(value) {
  return String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function phoneOf(value) {
  return String(value || "").match(/(?:\+?64|0)\s?[\d\s().-]{7,14}\d/)?.[0]?.trim() || "";
}

function areaOf(value) {
  const low = String(value || "").toLowerCase();
  if (low.includes("taita")) return "Taita";
  if (low.includes("naenae")) return "Naenae";
  if (low.includes("upper hutt")) return "Upper Hutt";
  if (low.includes("lower hutt")) return "Lower Hutt";
  if (low.includes("wainui")) return "Wainuiomata";
  return "Wellington";
}

function serviceOf(value) {
  const low = String(value || "").toLowerCase();
  if (low.includes("hedge")) return ["Hedge trimming", "garden_maintenance"];
  if (low.includes("clean")) return ["Cleaning", "cleaning"];
  if (low.includes("lawn") || low.includes("mow")) return ["Lawn mowing", "lawn_mowing"];
  if (low.includes("paint")) return ["Painting", "painting"];
  return ["General service", "other"];
}

function repeatOf(value) {
  const low = String(value || "").toLowerCase();
  if (low.includes("fortnight")) return "fortnightly";
  if (low.includes("weekly")) return "weekly";
  if (low.includes("monthly")) return "monthly";
  if (low.includes("repeat")) return "custom";
  return "one-off";
}

function dateTextOf(value) {
  const low = String(value || "").toLowerCase();
  if (low.includes("today")) return "Today";
  if (low.includes("tomorrow")) return "Tomorrow";
  if (low.includes("next week")) return "Next week";
  const short = String(value || "").match(/\b\d{1,2}[/.\-]\d{1,2}(?:[/.\-]\d{1,4})?\b/);
  return short?.[0] || "Date needed";
}

function isInvoiceBatch(value) {
  const low = String(value || "").toLowerCase();
  if (!/\binvoice\b/.test(low)) return false;
  if (/\ball\b.*\b(completed|complete|done|finished)?\s*jobs?\b/.test(low)) return true;
  if (/\b(completed|complete|done|finished)\s+jobs\b/.test(low)) return true;
  if (/\binvoice\s+jobs\b/.test(low)) return true;
  return false;
}

function isInvoiceJob(value) {
  return /\binvoice\b/i.test(value) && !isInvoiceBatch(value) && !amountOf(value);
}

function isChase(value) {
  return /\b(chase|follow\s*up|remind|reminder)\b/i.test(value) && /\b(invoice|invoices|unpaid|overdue|outstanding)\b/i.test(value);
}

function isFind(value) {
  return /\b(find|search|show|look up|lookup|open)\b/i.test(value);
}

function intentOf(value) {
  const low = String(value || "").toLowerCase();
  if (isChase(low)) return "chase_invoices";
  if (isInvoiceBatch(low)) return "invoice_batch";
  if (isInvoiceJob(low)) return "invoice_job";
  if (/\b(mark|set|make)?\s*\w*\s*(complete|completed|done|finished)\b|\bcomplete\s+\w+/i.test(low)) return "complete";
  if (isFind(low)) return "find";
  if (/\b(move|reschedule|shift|postpone|push|next week|change date|tomorrow instead)\b/.test(low)) return "reschedule";
  if (/\b(change|update|edit|price to|add note|note to|notes? for)\b/.test(low)) return "update";
  return "create";
}

function kindOf(value, intent) {
  const low = String(value || "").toLowerCase();
  if (["invoice_batch", "invoice_job"].includes(intent)) return "job";
  if (intent === "chase_invoices") return "invoice";
  if (/\b(worker|staff|employee|team member|person)\b/.test(low)) return "person";
  if (/\b(client|customer)\b/.test(low) && !/\bjob|quote|invoice\b/.test(low)) return "client";
  if (/\bquote|estimate\b/.test(low)) return "quote";
  if (/\binvoice|bill\b/.test(low)) return "invoice";
  return "job";
}

function nameOf(value, fallback = "Customer") {
  let cleaned = String(value || "")
    .replace(addressOf(value), " ")
    .replace(emailOf(value), " ")
    .replace(phoneOf(value), " ")
    .replace(/\$\s*\d+(?:\.\d+)?/g, " ")
    .replace(/\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{1,4})?\b/g, " ");
  const stop = new Set("add create make new please client customer person worker staff team job jobs completed complete quote estimate invoice invoices bill for at to from the a an address phone mobile email price charge amount total due pay rate mow mowing lawn lawns hedge trim clean today tomorrow next week move reschedule shift postpone push show find search unpaid overdue outstanding chase follow up remind reminder tell message sms text send change update edit note notes mark done finished repeat custom all worker staff person employee role".split(" "));
  const words = cleaned.match(/[A-Za-z][A-Za-z'-]*/g) || [];
  return words.filter((w) => !stop.has(w.toLowerCase())).slice(0, 2).map(title).join(" ") || fallback;
}

function parse(value) {
  const cleanedText = cleanText(value);
  const intent = intentOf(cleanedText);
  const kind = kindOf(cleanedText, intent);
  const amount = amountOf(cleanedText);
  const [service, jobType] = serviceOf(cleanedText);
  const personName = nameOf(cleanedText, "New worker");
  const clientName = kind === "person" ? "" : nameOf(cleanedText);
  const p = {
    intent,
    kind,
    clientName,
    personName,
    service,
    jobType,
    address: addressOf(cleanedText),
    area: areaOf(cleanedText),
    email: emailOf(cleanedText),
    phone: phoneOf(cleanedText),
    amount,
    priceText: money(amount),
    schedule: { human: dateTextOf(cleanedText), input: "", time: "" },
    repeat: repeatOf(cleanedText),
    notes: cleanedText,
    cleanedText,
    targetPage: ["invoice_batch", "invoice_job", "chase_invoices"].includes(intent) ? "invoices" : TARGET_PAGE[kind] || "jobs",
  };
  p.actionTitle = intent === "chase_invoices" ? "Prepare invoice follow-ups"
    : intent === "invoice_batch" ? "Draft invoices for completed jobs"
    : intent === "invoice_job" ? "Create draft invoice"
    : intent === "complete" ? "Complete job"
    : intent === "reschedule" ? "Reschedule job"
    : intent === "update" ? "Update job"
    : intent === "find" ? "Find records"
    : `Create ${TYPE_LABEL[kind] || "Record"}`;
  p.missing = [];
  return p;
}

function jobAmount(record, p = {}) {
  const r = record?.record || record || {};
  return Number(p.amount || r.price || r.fixed_price || r.total || r.subtotal || r.amount || record?.amount || 0);
}

function invoiceAmount(record) {
  const r = record?.record || record || {};
  return Number(r.amount_due || r.balance_due || r.total || r.subtotal || r.amount || record?.amount || 0);
}

function jobLabel(job) {
  return job?.title || job?.job_name || job?.customer_name || job?.client_name || job?.name || "Completed job";
}

function invoiceCustomer(inv) {
  return inv?.customer_name || inv?.client_name || inv?.name || "Customer";
}

function matchFromJob(job) {
  const amount = jobAmount(job);
  return {
    recordType: "job",
    id: job.id || job._id,
    label: jobLabel(job),
    summary: `${job.customer_name || job.client_name || "Customer"} · ${money(amount)}`,
    amount,
    record: job,
  };
}

function matchFromInvoice(inv) {
  const amount = invoiceAmount(inv);
  return {
    recordType: "invoice",
    id: inv.id || inv._id,
    label: inv.invoice_number || inv.number || invoiceCustomer(inv),
    summary: `${invoiceCustomer(inv)} · ${money(amount)} · ${inv.status || "unpaid"}`,
    amount,
    record: inv,
  };
}

function total(matches, getter) {
  return (matches || []).reduce((sum, item) => sum + getter(item), 0);
}

function detailsFor(p, live) {
  const count = live?.matches?.length || 0;
  const batchTotal = p.intent === "chase_invoices" ? total(live?.matches, invoiceAmount) : total(live?.matches, jobAmount);
  const liveText = ["invoice_batch", "chase_invoices"].includes(p.intent)
    ? `${count} item(s)`
    : live?.bestMatch
      ? `${live.bestMatch.label} · ${live.bestMatch.summary || "matched"}`
      : "Needs matching";
  const change = p.intent === "invoice_batch" ? `Create ${count} draft invoice(s) for ${money(batchTotal)}`
    : p.intent === "invoice_job" ? `Create draft invoice for ${money(jobAmount(live?.bestMatch, p))}`
    : p.intent === "chase_invoices" ? `Prepare ${count} follow-up draft(s) for ${money(batchTotal)}`
    : p.intent === "reschedule" ? p.schedule.human
    : p.intent === "update" ? (p.amount ? `Set price to ${p.priceText}` : p.notes)
    : p.intent === "complete" ? "Mark job completed"
    : p.service;
  if (p.intent !== "create") return [["Action", p.actionTitle], ["Live match", liveText], ["Change", change], ["Status", "Save to Review"]];
  if (p.kind === "client") return [["Client", p.clientName], ["Email", p.email || "Optional"], ["Phone", p.phone || "Optional"], ["Address", p.address || "Optional"]];
  if (p.kind === "person") return [["Worker", p.personName], ["Email", p.email || "Needed"], ["Phone", p.phone || "Optional"], ["Role", "Worker"]];
  if (p.kind === "quote") return [["Client", p.clientName], ["Scope", p.service], ["Address", p.address || "Optional"], ["Price", p.priceText]];
  if (p.kind === "invoice") return [["Client", p.clientName], ["Line", p.service], ["Amount", p.priceText], ["Status", "Draft only"]];
  return [["Client", p.clientName], ["Job", p.service], ["Address", p.address || "Needed"], ["Schedule", p.schedule.human], ["Price", p.priceText], ["Repeat", p.repeat]];
}

function ActionGroups({ onPick }) {
  return <div style={groupGrid} aria-label="Tell Churvox examples">
    {ACTION_GROUPS.map((group) => <section key={group.title} style={groupBox}>
      <div style={groupHead}>
        <b style={groupTitle}>{group.title}</b>
        <span style={groupHint}>{group.hint}</span>
      </div>
      <div style={pillBar}>
        {group.actions.map(([key, label, value]) => <button key={key} type="button" style={pillButton} onClick={() => onPick(value)}>{label}</button>)}
      </div>
    </section>)}
  </div>;
}

function ApprovalModal({ parsed, live, rawText, onClose, onReview }) {
  if (!parsed) return null;
  const items = (live?.matches || []).slice(0, 6);
  return <div className="freshQuickAiModalShade" role="dialog" aria-modal="true">
    <div className="freshQuickAiModal">
      <button className="freshQuickAiModalClose" type="button" onClick={onClose}>×</button>
      <header>
        <span>Owner approval</span>
        <h2>{parsed.actionTitle}</h2>
        <p>Check the details first. Nothing changes, sends, or syncs until you approve.</p>
      </header>
      <div className="freshQuickAiModalGrid">
        <section className="freshQuickAiResult modalCards">
          {detailsFor(parsed, live).map(([label, value]) => <section key={label}>
            <b>{label}</b>
            <p>{value}</p>
          </section>)}
        </section>
        <section className="freshQuickAiPrepared modalExplain">
          <b>You typed</b><p>{rawText}</p>
          <b>Churvox cleaned</b><p>{parsed.cleanedText}</p>
          <b>Safe rule</b>
          <p>{parsed.intent === "chase_invoices" ? "Follow-ups save as Review drafts only. Nothing is sent." : parsed.intent.startsWith("invoice") || parsed.kind === "invoice" ? "Invoices stay draft only. No send or Xero sync." : parsed.intent === "find" ? "Search only. Nothing changes." : "Live records update only after approval."}</p>
        </section>
      </div>
      {parsed.intent !== "create" ? <div className="freshQuickAiStatus need">
        <b>{live?.previewTitle || "Live match"}</b>
        <span>{(live?.previewLines || []).join(" ") || "Search runs when you ask Churvox to understand."}</span>
        {items.length ? <span>{items.map((m) => `${m.label} — ${m.summary || money(m.amount)}`).join(" | ")}</span> : null}
      </div> : null}
      <div className="freshQuickAiEdit"><b>Fix details here</b><div><label className="wide"><span>Notes</span><textarea readOnly value={parsed.notes || ""} /></label></div></div>
      <div className="freshQuickAiModalActions">
        <button type="button" onClick={onReview}>{parsed.intent === "chase_invoices" ? "Save follow-up drafts" : parsed.intent === "invoice_batch" ? "Approve draft invoices" : parsed.intent === "invoice_job" ? "Approve draft invoice" : parsed.intent === "create" ? "Approve + create" : "Approve change"}</button>
        <button type="button" onClick={onReview}>Save to Review</button>
        <button type="button" onClick={onClose}>Cancel</button>
      </div>
    </div>
  </div>;
}

export default function FreshAiQuickCreateBrainV8({ onNavigate }) {
  const { get, post } = useApi();
  const [text, setText] = React.useState(FIRST_EXAMPLE);
  const [draft, setDraft] = React.useState(null);
  const [live, setLive] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const [analysing, setAnalysing] = React.useState(false);
  const parsed = draft || parse(text);
  const typoFixed = cleanText(text) !== String(text || "").replace(/\s+/g, " ").trim();

  function setExample(value) {
    setText(value);
    setDraft(null);
    setLive(null);
    setStatus(null);
    setOpen(false);
  }

  function updateText(value) {
    setText(value);
    setDraft(null);
    setLive(null);
    setStatus(null);
    setOpen(false);
  }

  async function loadBatchJobs() {
    const res = await get("/jobs", { params: { status: "completed" }, timeout: 15000 });
    const jobs = Array.isArray(res?.data) ? res.data : [];
    const matches = jobs.filter((job) => jobAmount(job) > 0 && !(job?.invoice_id || job?.invoice_created || job?.invoiced)).slice(0, 25).map(matchFromJob);
    const body = {
      matches,
      bestMatch: matches[0] || null,
      ambiguity: matches.length ? "none" : "no_match",
      previewTitle: matches.length ? "Completed jobs ready to invoice" : "No completed priced jobs ready",
      previewLines: matches.length ? [`${matches.length} job(s) ready.`, `Draft total ${money(total(matches, jobAmount))}.`, "Draft only — no sending or Xero sync."] : ["No completed jobs with prices found."],
    };
    setLive(body);
    return body;
  }

  async function loadInvoiceChase() {
    const res = await get("/invoices", { timeout: 15000 });
    const invoices = Array.isArray(res?.data) ? res.data : [];
    const matches = invoices.filter((inv) => ["sent", "overdue", "unpaid"].includes(String(inv.status || "").toLowerCase()) && invoiceAmount(inv) > 0).slice(0, 25).map(matchFromInvoice);
    const body = {
      matches,
      bestMatch: matches[0] || null,
      ambiguity: matches.length ? "none" : "no_match",
      previewTitle: matches.length ? "Unpaid invoices ready for follow-up" : "No unpaid invoices ready",
      previewLines: matches.length ? [`${matches.length} invoice(s) ready.`, `Outstanding total ${money(total(matches, invoiceAmount))}.`, "Draft follow-ups only — nothing sent."] : ["No sent or overdue invoices with balances found."],
    };
    setLive(body);
    return body;
  }

  async function loadLive(candidate) {
    if (candidate.intent === "invoice_batch") return loadBatchJobs();
    if (candidate.intent === "chase_invoices") return loadInvoiceChase();
    if (candidate.intent === "create") return null;
    const res = await post("/tell-churvox/preview", { text: candidate.cleanedText, parsed: candidate, intent: candidate.intent, kind: candidate.kind }, { timeout: 15000 });
    const body = res?.success ? res.data : { matches: [], bestMatch: null, ambiguity: "error", previewTitle: "Live match unavailable", previewLines: [res?.error || "Could not search records yet."] };
    setLive(body);
    return body;
  }

  async function understand({ show = false } = {}) {
    if (!text.trim()) return setStatus({ tone: "need", text: "Tell Churvox what you want done first." });
    setAnalysing(true);
    const next = parse(text);
    setDraft(next);
    const match = await loadLive(next);
    setAnalysing(false);
    setStatus({ tone: "ok", text: `Churvox understood it.${match?.bestMatch ? ` Found ${match.bestMatch.label}.` : match?.matches?.length ? ` ${match.matches.length} item(s) ready.` : ""}` });
    if (show) setOpen(true);
    return next;
  }

  async function openModal() {
    const next = draft || await understand();
    if (next && next.intent !== "create" && !live) await loadLive(next);
    if (next) setOpen(true);
  }

  function saveReview(candidate = parsed, match = live) {
    const details = Object.fromEntries(detailsFor(candidate, match));
    const slip = {
      id: `tell-churvox-${Date.now()}`,
      type: candidate.kind,
      category: candidate.intent,
      title: `${candidate.actionTitle} ready for review`,
      summary: candidate.actionTitle,
      details,
      livePreview: match,
      source: "Tell Churvox",
      status: "open",
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    [REVIEW_KEY, OLD_REVIEW_KEY].forEach((key) => {
      const current = JSON.parse(window.localStorage.getItem(key) || "[]");
      window.localStorage.setItem(key, JSON.stringify([slip, ...(Array.isArray(current) ? current : [])].slice(0, 50)));
    });
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "tell-churvox-review" } }));
    setStatus({ tone: "ok", text: "Saved to Review. Nothing changes until approved." });
    setOpen(false);
  }

  const cards = detailsFor(parsed, live);

  return <section className="freshQuickAiPage">
    <div className="freshQuickAiHero">
      <div>
        <span>Tell Churvox</span>
        <h1>Say what you want done.</h1>
        <p>No dropdown. Type messy. Churvox understands, finds records, shows a pop-up, then waits for approval.</p>
      </div>
      <div className="freshQuickAiStats">
        <div><b>{parsed.actionTitle}</b><small>understood</small></div>
        <div><b>{parsed.priceText}</b><small>money</small></div>
        <div><b>{parsed.missing?.length || 0}</b><small>required</small></div>
        <div><b>{typoFixed ? "Typo fix" : "Smart"}</b><small>brain</small></div>
      </div>
    </div>
    <div className="freshQuickAiGrid">
      <article className="freshQuickAiPanel">
        <header><span>One brain</span><h2>Tell Churvox like a real assistant.</h2><p>Pick a grouped action below or type your own instruction.</p></header>
        <textarea value={text} onChange={(e) => updateText(e.target.value)} />
        {typoFixed ? <div className="freshQuickAiStatus ok"><b>Auto cleaned</b><span>{cleanText(text)}</span></div> : null}
        <div className="freshQuickAiButtons">
          <button type="button" onClick={() => understand({ show: true })} disabled={analysing}>{analysing ? "Thinking…" : "Understand + show pop-up"}</button>
          <button type="button" onClick={openModal} disabled={analysing}>Open approval pop-up</button>
        </div>
        <ActionGroups onPick={setExample} />
        {status ? <div className={`freshQuickAiStatus ${status.tone}`}><b>{status.tone === "ok" ? "Done" : "Needs attention"}</b><span>{status.text}</span></div> : null}
      </article>
      <article className="freshQuickAiPanel">
        <header><span>Smart preview</span><h2>{parsed.actionTitle}</h2><p>The approval pop-up is where Churvox does the final owner check.</p></header>
        <div className="freshQuickAiResult">
          {cards.map(([label, value]) => <section key={label}><b>{label}</b><p>{value}</p></section>)}
        </div>
        {parsed.intent !== "create" ? <div className="freshQuickAiStatus need"><b>{live?.previewTitle || "Live match"}</b><span>{(live?.previewLines || []).join(" ") || "Search runs when you ask Churvox to understand."}</span></div> : null}
        <div className="freshQuickAiPrepared"><b>Original</b><p>{text}</p><b>Cleaned</b><p>{parsed.cleanedText}</p><b>Safe rule</b><p>{parsed.intent.startsWith("invoice") || parsed.kind === "invoice" ? "Invoices stay draft only. Nothing is sent or synced without approval." : parsed.intent === "find" ? "Search only. Nothing changes." : "Live changes only happen after a confident match and approval."}</p></div>
        <div className="freshQuickAiButtons"><button type="button" onClick={openModal}>Open approval pop-up</button><button type="button" onClick={() => onNavigate?.(parsed.targetPage)}>Open {parsed.targetPage}</button></div>
      </article>
    </div>
    <ApprovalModal parsed={open ? parsed : null} live={live} rawText={text} onClose={() => setOpen(false)} onReview={() => saveReview(parsed, live)} />
  </section>;
}
