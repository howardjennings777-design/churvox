import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshPayrollCompact.css";
import "./freshJobsPolish.css";

export const COMMAND_REPLACED_APPROVAL_PAGE_MARKER_20260627 = "COMMAND_REPLACED_APPROVAL_PAGE_MARKER_20260627";

const commandFilters = ["Open", "Edited", "Notes", "Handled", "All"];
const LEGACY_INBOX_KEYS = ["churvox:fresh-command-inbox:v1", "churvox:review-inbox:v1"];
const COMMAND_ACTIVITY_KEY = "churvox:fresh-command-activity:v1";

const GENERIC_REVIEW_PHRASES = [
  "ai prepared admin work",
  "ai reviewed the live business records",
  "owner approval is required before churvox changes real records",
  "waiting for owner review",
  "approval required",
  "needs_clarification",
  "needs clarification",
  "not prepared",
  "needs preparation",
  "needs concrete draft",
  "this card does not include",
  "came from the instruction",
];

const EMPTY_BUSINESS_VALUES = ["for", "customer", "client", "none", "n/a", "na", "unknown", "undefined", "null"];
const NON_BUSINESS_FIELDS = ["source", "category", "group", "owner_rule", "status", "created_at", "updated_at", "id", "_id", "business_id", "user_id"];
const HIDDEN_DETAIL_FIELDS = ["what churvox found", "what churvox prepared", "why it needs approval", "owner rule", "owner note", "owner instruction", "summary", "reason"];

const DETAIL_LABELS = {
  customer_name: "Customer",
  customer: "Customer",
  client_name: "Customer",
  client: "Customer",
  contact_name: "Contact",
  address: "Address",
  site_address: "Address",
  service_address: "Address",
  job_address: "Address",
  job_title: "Job",
  job_name: "Job",
  service: "Work",
  service_type: "Work",
  amount: "Amount",
  total: "Amount",
  price: "Price",
  fixed_price: "Price",
  scheduled_date: "Date",
  due_date: "Due",
  worker_name: "Worker",
  assigned_worker_name: "Worker",
  phone: "Phone",
  email: "Email",
  message_text: "Message",
  prepared_message: "Message",
};

const APPROVAL_DETAIL_FIELDS = [
  { label: "Customer", keys: ["customer_name", "client_name", "customer", "client", "contact_name", "name"] },
  { label: "Job", keys: ["job_title", "job_name", "title", "service", "service_type", "work_type", "job_type"] },
  { label: "Address", keys: ["service_address", "job_address", "site_address", "address", "customer_address", "client_address"] },
  { label: "Price", keys: ["price", "fixed_price", "amount", "total", "job_price", "quoted_price", "invoice_total", "quote_total"] },
  { label: "Billing", keys: ["billing_type", "pricing_type", "invoice_type", "charge_type", "rate_type"] },
  { label: "Date", keys: ["scheduled_date", "date", "due_date", "start_date", "job_date", "next_visit_date"] },
  { label: "Worker", keys: ["worker_name", "assigned_worker_name", "assigned_to_name", "assigned_worker", "team_member", "worker"] },
  { label: "Recurring", keys: ["recurring", "is_recurring", "isRecurring", "repeat", "repeats", "recurring_frequency", "frequency", "repeat_frequency", "recurrence", "recurring_rule"] },
];

function cleanString(value) {
  return String(value || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function cleanBusinessText(value) {
  return cleanString(value).replace(/^for\s*[-:]*\s*/i, "").replace(/^customer\s*[:=-]?\s*$/i, "").trim();
}

function normalizedText(value) {
  return cleanString(value).toLowerCase();
}

function normalizedKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function isEmptyBusinessValue(value) {
  const text = normalizedText(value);
  return !text || EMPTY_BUSINESS_VALUES.includes(text);
}

function isGenericReviewText(value) {
  const text = normalizedText(value);
  if (!text) return true;
  return GENERIC_REVIEW_PHRASES.some((phrase) => text === phrase || text.includes(phrase));
}

function displayLabel(key) {
  const normalized = normalizedKey(key);
  return DETAIL_LABELS[normalized] || cleanString(key).replace(/^details\s*/i, "");
}

function shouldShowDetailField(key, value) {
  const label = normalizedText(key);
  if (!label || NON_BUSINESS_FIELDS.includes(label)) return false;
  if (HIDDEN_DETAIL_FIELDS.some((hidden) => label.includes(hidden))) return false;
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function usefulValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.map(usefulValue).filter(Boolean).join(". ");
    const text = Object.entries(value)
      .filter(([key, v]) => shouldShowDetailField(key, v))
      .map(([key, v]) => `${displayLabel(key)}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join(". ");
    return isGenericReviewText(text) ? "" : text;
  }
  const text = cleanBusinessText(value);
  if (isEmptyBusinessValue(text) || isGenericReviewText(text)) return "";
  return text;
}

function hasUsefulObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).some(([key, v]) => shouldShowDetailField(key, v) && Boolean(usefulValue(v)));
}

function hasPreparedText(item) {
  return Boolean(usefulValue(item?.prepared || item?.draft || item?.next_action || item?.recommended_action || item?.approval_action || item?.message_text || item?.prepared_message));
}

function hasConcretePreparedAction(item) {
  if (!item) return false;
  if (item.sourceMode === "note") return true;
  const action = normalizedText(item.action || item.type);
  if (["needs clarification", "needs preparation", "not prepared", "other"].includes(action)) return false;
  return hasPreparedText(item) || hasUsefulObject(item.payload) || hasUsefulObject(item.details) || hasUsefulObject(item.preview);
}

function asArray(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of ["items", "results", "review_items", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(value, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return idOf(value.$oid || value.oid || value.id || value._id, fallback);
  return fallback;
}

function readableAction(value) {
  const text = cleanString(value || "");
  if (!text) return "Review and approve";
  return text
    .replace(/^create job$/i, "Create job")
    .replace(/^create invoice$/i, "Create invoice")
    .replace(/^send payment followup$/i, "Send payment follow-up")
    .replace(/^prepare quote followup$/i, "Send quote follow-up");
}

function titleOf(item) {
  const title = usefulValue(item?.title || item?.summary);
  if (title) return title;
  const category = usefulValue(item?.category || item?.group);
  const action = usefulValue(item?.action || item?.type);
  if (category || action) return readableAction([action, category].filter(Boolean).join(" "));
  return item?.preparedForApproval === false ? "Needs preparation" : "Ready to approve";
}

function summaryOf(item) {
  const summary = usefulValue(item?.summary || item?.message || item?.description || item?.original_text);
  if (summary) return summary;
  if (item?.preparedForApproval === false) return "Churvox has not prepared a clear action from this yet.";
  return "Ready for your decision.";
}

function statusOf(item) {
  return String(item?.status || "open").trim().toLowerCase();
}

function categoryOf(item) {
  return usefulValue(item?.category || item?.group || item?.source) || "Review";
}

function detailSources(item) {
  return [item?.payload, item?.details, item?.preview, item?.form, item?.raw, typeof item?.draft === "object" ? item.draft : null, item].filter((value) => value && typeof value === "object");
}

function findFieldValue(value, keys, depth = 0) {
  if (!value || typeof value !== "object" || depth > 5) return undefined;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findFieldValue(entry, keys, depth + 1);
      if (found !== undefined && found !== null && String(found).trim() !== "") return found;
    }
    return undefined;
  }

  const wanted = new Set(keys.map(normalizedKey));
  for (const [key, raw] of Object.entries(value)) {
    if (wanted.has(normalizedKey(key)) && raw !== null && raw !== undefined && String(raw).trim() !== "") return raw;
  }

  for (const raw of Object.values(value)) {
    if (raw && typeof raw === "object") {
      const found = findFieldValue(raw, keys, depth + 1);
      if (found !== undefined && found !== null && String(found).trim() !== "") return found;
    }
  }
  return undefined;
}

function formatApprovalValue(label, value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && /price|amount|total/i.test(label)) return `$${value.toFixed(2)}`;
  if (Array.isArray(value)) return value.map((entry) => formatApprovalValue(label, entry)).filter(Boolean).join(", ");
  if (typeof value === "object") return usefulValue(value) || JSON.stringify(value);
  return usefulValue(value);
}

function sameMeaning(a, b) {
  const left = normalizedText(a);
  const right = normalizedText(b);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function recurringApprovalText(item) {
  const sources = detailSources(item);
  const enabledKeys = ["recurring", "is_recurring", "isRecurring", "repeat", "repeats"];
  const frequencyKeys = ["recurring_frequency", "frequency", "repeat_frequency", "repeat_every", "recurrence", "recurring_rule", "rrule"];
  const enabled = sources.map((source) => findFieldValue(source, enabledKeys)).find((value) => value !== undefined && value !== null && String(value).trim() !== "");
  const frequency = sources.map((source) => findFieldValue(source, frequencyKeys)).find((value) => value !== undefined && value !== null && String(value).trim() !== "");
  const enabledText = formatApprovalValue("Recurring", enabled);
  const frequencyText = formatApprovalValue("Recurring", frequency);
  if (frequencyText && enabledText && !sameMeaning(frequencyText, enabledText)) return `${enabledText === "No" ? "No" : "Yes"} - ${frequencyText}`;
  return frequencyText || enabledText || "";
}

function approvalDetailRows(item) {
  if (!item) return [];
  const rows = [];
  const seen = new Set();
  const sources = detailSources(item);

  APPROVAL_DETAIL_FIELDS.forEach(({ label, keys }) => {
    let value = "";
    if (label === "Recurring") value = recurringApprovalText(item);
    else {
      for (const source of sources) {
        value = formatApprovalValue(label, findFieldValue(source, keys));
        if (value) break;
      }
    }
    if (!value) return;
    const dedupeKey = `${label}:${value}`.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    rows.push({ label, value });
  });
  return rows;
}

function buildFormRows(item, approvalRows) {
  if (!item) return [];
  const rows = [...approvalRows];
  if (!rows.some((row) => normalizedText(row.label) === "action")) {
    rows.push({ label: "Action", value: readableAction(item.action || item.type || item.category || item.group) });
  }
  if (!rows.length) rows.push({ label: "Record", value: summaryOf(item) });
  return rows.filter((row) => row.value && !/undefined|null/i.test(row.value));
}

function readLegacyInbox() {
  try {
    if (typeof window === "undefined") return [];
    return LEGACY_INBOX_KEYS.flatMap((key) => {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((item, index) => ({ ...item, localKey: key, localIndex: index, localOnly: true })) : [];
    });
  } catch {
    return [];
  }
}

function clearLegacyInbox() {
  try {
    if (typeof window !== "undefined") LEGACY_INBOX_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {}
}

function loadActivity() {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(COMMAND_ACTIVITY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function actionPage(item) {
  const text = `${item?.action || ""} ${item?.category || ""} ${item?.group || ""} ${item?.page || ""}`.toLowerCase();
  if (text.includes("invoice") || text.includes("money")) return "invoices";
  if (text.includes("payment")) return "payments";
  if (text.includes("quote")) return "quotes";
  if (text.includes("client") || text.includes("customer")) return "clients";
  if (text.includes("payroll")) return "payroll";
  if (text.includes("xero") || text.includes("accounting")) return "xero";
  if (text.includes("worker") || text.includes("dispatch")) return "workercommand";
  return item?.page || "jobs";
}

function legacyText(item) {
  const details = item?.details && typeof item.details === "object" ? Object.entries(item.details).map(([key, value]) => `${key}: ${value}`).join(". ") : "";
  const payload = item?.payload && typeof item.payload === "object" ? Object.entries(item.payload).map(([key, value]) => `${key}: ${value}`).join(". ") : "";
  return [item?.title, item?.summary, item?.info, item?.found, item?.prepared, item?.why, item?.owner, details, payload].filter(Boolean).join(". ");
}

function scrubApprovalGroupText(value) {
  return normalizedText(value)
    .replace(/[a-f0-9]{16,}/gi, "")
    .replace(/\b\d{8,}\b/g, "")
    .replace(/\$?\d+(?:\.\d{1,2})?/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

function approvalGroupKey(item) {
  if (!item || item.sourceMode === "note" || ["approved", "ignored", "declined", "closed"].includes(item.listStatus)) {
    return `single:${item?.sourceMode || "item"}:${idOf(item?.id || item?._id, item?.localIndex || Math.random())}`;
  }

  const details = approvalDetailRows(item)
    .filter((row) => !["Date", "Worker"].includes(row.label))
    .map((row) => `${row.label}:${row.value}`)
    .join("|");
  const concreteFacts = scrubApprovalGroupText(details);
  const fallback = scrubApprovalGroupText(`${titleOf(item)} ${summaryOf(item)}`);
  return [item.sourceMode, item.listStatus, categoryOf(item), readableAction(item.action || item.type), concreteFacts || fallback].map(scrubApprovalGroupText).join("|");
}

function groupCommandRows(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = approvalGroupKey(item);
    const existing = groups.get(key);
    if (existing) existing.items.push(item);
    else groups.set(key, { key, item, items: [item] });
  });
  return Array.from(groups.values());
}

function duplicateBackendRows(groups) {
  return groups.flatMap((group) => group.items.slice(1).filter((item) => item.sourceMode === "backend" && ["open", "edited"].includes(item.listStatus)));
}

export default function FreshCommand({ onNavigate }) {
  const { get, post, patch } = useApi();
  const [backendItems, setBackendItems] = React.useState([]);
  const [noteItems, setNoteItems] = React.useState(readLegacyInbox);
  const [selectedId, setSelectedId] = React.useState("");
  const [filter, setFilter] = React.useState("Open");
  const [activity, setActivity] = React.useState(loadActivity);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState("");
  const [message, setMessage] = React.useState("Checking work for you.");
  const [ownerNote, setOwnerNote] = React.useState("");

  const backendRows = backendItems.map((item) => {
    const row = { ...item, sourceMode: "backend", listStatus: statusOf(item) };
    row.preparedForApproval = hasConcretePreparedAction(row);
    return row;
  });
  const preparedBackendRows = backendRows.filter((item) => item.preparedForApproval);
  const diagnosticRows = backendRows.filter((item) => !item.preparedForApproval);
  const noteRows = noteItems.map((item) => ({ ...item, sourceMode: "note", listStatus: "note", preparedForApproval: true }));
  const rows = [...preparedBackendRows, ...noteRows, ...diagnosticRows];

  const counts = {
    Open: preparedBackendRows.filter((item) => ["open", "edited"].includes(item.listStatus)).length,
    Edited: preparedBackendRows.filter((item) => item.listStatus === "edited").length,
    Notes: noteRows.length,
    Handled: backendRows.filter((item) => ["approved", "ignored", "declined", "closed"].includes(item.listStatus)).length,
    All: rows.length,
  };

  const visibleRows = rows.filter((item) => {
    if (filter === "All") return true;
    if (filter === "Notes") return item.sourceMode === "note";
    if (filter === "Handled") return item.sourceMode === "backend" && ["approved", "ignored", "declined", "closed"].includes(item.listStatus);
    if (filter === "Edited") return item.sourceMode === "backend" && item.preparedForApproval && item.listStatus === "edited";
    return item.sourceMode === "backend" && item.preparedForApproval && ["open", "edited"].includes(item.listStatus);
  });
  const visibleGroups = groupCommandRows(visibleRows);
  const duplicateRows = duplicateBackendRows(visibleGroups);
  const selected = visibleRows.find((item) => `${item.sourceMode}-${idOf(item.id || item._id, item.localIndex)}` === selectedId) || visibleGroups[0]?.item || null;
  const selectedKey = selected ? `${selected.sourceMode}-${idOf(selected.id || selected._id, selected.localIndex)}` : "";
  const selectedHasConcreteAction = Boolean(selected?.sourceMode === "backend" && selected.preparedForApproval);
  const selectedDiagnosticOnly = Boolean(selected?.sourceMode === "backend" && !selected.preparedForApproval);
  const selectedApprovalDetails = approvalDetailRows(selected);
  const formRows = buildFormRows(selected, selectedApprovalDetails);
  const moneyWatched = preparedBackendRows.filter((item) => /money|invoice|payment/i.test(`${item.category || ""} ${item.action || ""}`)).length;

  const loadReview = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await get("/ai-review-items?limit=200", { timeout: 25000 });
      if (!result?.success) throw new Error(result?.error || "Command is protected or not ready.");
      const next = asArray(result.data ?? result);
      const readyCount = next.filter((item) => hasConcretePreparedAction({ ...item, sourceMode: "backend" })).length;
      setBackendItems(next);
      setMessage(readyCount ? `${readyCount} item${readyCount === 1 ? "" : "s"} ready for your decision.` : "No work waiting for you right now.");
    } catch (err) {
      setBackendItems([]);
      setMessage(err?.message || "Command is protected or not ready.");
    } finally {
      setNoteItems(readLegacyInbox());
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => { loadReview(); }, [loadReview]);
  React.useEffect(() => {
    const refresh = () => { setNoteItems(readLegacyInbox()); loadReview(); };
    window.addEventListener("churvox:fresh-data-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("churvox:fresh-data-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadReview]);
  React.useEffect(() => { setOwnerNote(selected?.owner_note || selected?.owner || ""); }, [selectedKey]);
  React.useEffect(() => {
    try { if (typeof window !== "undefined") window.localStorage.setItem(COMMAND_ACTIVITY_KEY, JSON.stringify(activity)); } catch {}
  }, [activity]);

  function addActivity(title, status) {
    setActivity((current) => [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title, status, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...current].slice(0, 8));
  }

  async function approveSelected() {
    if (!selectedHasConcreteAction) return;
    const id = idOf(selected.id || selected._id);
    if (!id) return;
    setBusy("approve");
    try {
      const result = await post(`/ai-review-items/${encodeURIComponent(id)}/approve`, { note: ownerNote }, { timeout: 30000 });
      if (!result?.success) throw new Error(result?.error || "Could not approve this.");
      addActivity(titleOf(selected), "Approved");
      setMessage("Approved. Churvox handled it.");
      setSelectedId("");
      await loadReview();
    } catch (err) {
      setMessage(err?.message || "Could not approve this.");
    } finally {
      setBusy("");
    }
  }

  async function approveOrPrepareSelected() {
    if (selected?.sourceMode === "note") {
      await prepareNotes();
      return;
    }
    await approveSelected();
  }

  async function saveSelected() {
    if (!selected || selected.sourceMode !== "backend") return;
    const id = idOf(selected.id || selected._id);
    if (!id) return;
    setBusy("save");
    try {
      const result = await patch(`/ai-review-items/${encodeURIComponent(id)}`, { note: ownerNote }, { timeout: 25000 });
      if (!result?.success) throw new Error(result?.error || "Could not save your edit.");
      addActivity(titleOf(selected), "Edited");
      setMessage("Saved. It is still waiting for your approval.");
      await loadReview();
    } catch (err) {
      setMessage(err?.message || "Could not save your edit.");
    } finally {
      setBusy("");
    }
  }

  async function ignoreSelected() {
    if (!selected || selected.sourceMode !== "backend") return;
    const id = idOf(selected.id || selected._id);
    if (!id) return;
    setBusy("ignore");
    try {
      const result = await post(`/ai-review-items/${encodeURIComponent(id)}/ignore`, { note: ownerNote }, { timeout: 25000 });
      if (!result?.success) throw new Error(result?.error || "Could not park this.");
      addActivity(titleOf(selected), "Parked");
      setMessage("Parked for now. Nothing was changed.");
      setSelectedId("");
      await loadReview();
    } catch (err) {
      setMessage(err?.message || "Could not park this.");
    } finally {
      setBusy("");
    }
  }

  async function archiveDuplicateApprovals() {
    if (!duplicateRows.length) {
      setMessage("No duplicate approval cards found.");
      return;
    }
    setBusy("dedupe");
    let archived = 0;
    let failed = 0;
    for (const item of duplicateRows.slice(0, 75)) {
      const id = idOf(item.id || item._id);
      if (!id) {
        failed += 1;
        continue;
      }
      try {
        const result = await post(`/ai-review-items/${encodeURIComponent(id)}/ignore`, { note: "Archived as duplicate from grouped Command queue." }, { timeout: 25000 });
        if (result?.success) archived += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    addActivity("Archived duplicate approvals", archived ? "Cleaned" : "No change");
    setMessage(archived ? `Archived ${archived} duplicate approval${archived === 1 ? "" : "s"}.${failed ? ` ${failed} failed.` : ""}` : "Could not archive duplicate approvals.");
    setBusy("");
    await loadReview();
  }

  async function prepareNotes() {
    if (!noteItems.length) {
      setMessage("No saved notes to prepare.");
      return;
    }
    setBusy("prepare");
    let prepared = 0;
    let failed = 0;
    for (const item of noteItems.slice(0, 20)) {
      try {
        const result = await post("/tell-churvox/prepare", { text: legacyText(item) || titleOf(item) }, { timeout: 30000 });
        if (result?.success) prepared += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    if (prepared) clearLegacyInbox();
    setNoteItems(readLegacyInbox());
    addActivity("Prepared saved notes", prepared ? "Prepared" : "Failed");
    setMessage(prepared ? `Prepared ${prepared} saved note${prepared === 1 ? "" : "s"}.${failed ? ` ${failed} failed.` : ""}` : "Could not prepare saved notes.");
    setBusy("");
    await loadReview();
  }

  async function checkForWork() {
    setBusy("scan");
    try {
      const text = "Prepare completed admin work for owner approval from real Churvox records. Return only concrete approval-ready items. For any job approval item, include exact customer/client, job title or service, service address, scheduled date, worker, price or amount, billing type, recurring yes/no, recurring frequency or next visit date, current status, and the prepared draft/message/change. Include draft invoice from completed job, payment follow-up message for unpaid invoice, quote follow-up message, client detail request, worker acknowledgement reminder, payroll review summary, or Xero draft sync check where relevant. Do not create explanation-only or needs-clarification cards. Owner approval required. Do not send invoices, file tax, create bank payout files, or mark paid automatically.";
      const result = await post("/tell-churvox/prepare", { text }, { timeout: 30000 });
      if (!result?.success) throw new Error(result?.error || "Could not check for work.");
      addActivity("Checked for work", "Done");
      setMessage("Checked. Anything ready for you will appear in Open.");
      await loadReview();
    } catch (err) {
      setMessage(err?.message || "Could not check for work.");
    } finally {
      setBusy("");
    }
  }

  function openSelectedRecord() {
    if (!selected || selected.sourceMode === "note") return;
    onNavigate?.(actionPage(selected));
  }

  return (
    <section className="freshCommandRebuild" data-command-replaced={COMMAND_REPLACED_APPROVAL_PAGE_MARKER_20260627}>
      <header className="freshCommandRebuildHero">
        <div>
          <span>Command</span>
          <h1>Admin queue</h1>
          <p>Churvox prepares invoices, messages, payroll summaries and Xero draft checks from job proof. You approve, edit or park it.</p>
        </div>
        <div className="freshCommandHeroActions">
          <button type="button" disabled={busy === "scan"} onClick={checkForWork}>{busy === "scan" ? "Checking..." : "Check for work"}</button>
          <button type="button" disabled={busy === "refresh" || loading} onClick={loadReview}>Refresh</button>
        </div>
      </header>

      <section className="freshCommandStatsRow">
        <article><span>Waiting</span><b>{loading ? "..." : counts.Open}</b></article>
        <article><span>Money</span><b>{loading ? "..." : moneyWatched}</b></article>
        <article><span>Notes</span><b>{loading ? "..." : counts.Notes}</b></article>
        <article><span>Handled</span><b>{loading ? "..." : counts.Handled}</b></article>
      </section>

      {message ? <section className="freshCommandStatusStrip"><b>{message}</b><span>Simple on top. The proof, memory and admin work stay underneath until a decision is needed.</span></section> : null}

      <section className="freshCommandMemoryExample" aria-label="Command memory example">
        <span>Memory example</span>
        <b>Last time this client paid $85 for this type of job. Churvox prepared $85 again.</b>
        <small>Approve it, edit it, or park it. The owner stays in control.</small>
      </section>

      <section className="freshCommandPowerStrip" aria-label="Command approval system">
        <article><b>Admin Queue</b><span>Only what needs a decision</span></article>
        <article><b>Prepared by Churvox</b><span>Invoice, message, payroll or Xero draft</span></article>
        <article><b>Proof</b><span>Job, note, photo, worker time and client</span></article>
        <article><b>Owner Decision</b><span>Approve, edit or park</span></article>
        <article><b>Memory</b><span>Past prices and owner patterns</span></article>
      </section>

      <section className="freshCommandBoard">
        <aside className="freshCommandQueuePanel">
          <div className="freshCommandPanelTitle"><span>Approval queue</span><b>{visibleGroups.length}</b></div>
          <div className="freshCommandFilters">
            {commandFilters.map((item) => (
              <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                {item}<b>{counts[item] ?? rows.length}</b>
              </button>
            ))}
          </div>
          <div className="freshCommandQueueList">
            {loading && !visibleGroups.length ? <article><b>Checking...</b><span>Looking for approval work.</span></article> : null}
            {!loading && !visibleGroups.length ? <article><b>Nothing waiting</b><span>Run Check for work when you want Churvox to prepare admin actions.</span></article> : null}
            {visibleGroups.map((group, index) => {
              const item = group.item;
              const key = `${item.sourceMode}-${idOf(item.id || item._id, item.localIndex ?? index)}`;
              const diagnostic = item.sourceMode === "backend" && !item.preparedForApproval;
              return (
                <button type="button" className={selectedKey === key ? "active" : ""} key={group.key} onClick={() => setSelectedId(key)}>
                  <em>{item.sourceMode === "note" ? "Note" : diagnostic ? "Needs work" : "Ready"}</em>
                  <b>{titleOf(item)}{group.items.length > 1 ? <small>x{group.items.length}</small> : null}</b>
                  <span>{summaryOf(item)}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="freshCommandFormPanel">
          {selected ? (
            <form onSubmit={(event) => { event.preventDefault(); approveOrPrepareSelected(); }}>
              <header className="freshCommandFormHeader">
                <div>
                  <span>{categoryOf(selected)}</span>
                  <h2>{titleOf(selected)}</h2>
                </div>
                <b>{selected.sourceMode === "note" ? "Prepare" : selectedDiagnosticOnly ? "Needs edit" : "Ready"}</b>
              </header>

              <section className="freshCommandFilledForm" aria-label="Filled approval form">
                {formRows.map((row) => (
                  <label key={`${row.label}-${row.value}`}>
                    <span>{row.label}</span>
                    <b>{row.value}</b>
                  </label>
                ))}
              </section>

              <label className="freshCommandOwnerEdit">
                <span>Owner note / edit</span>
                <textarea value={ownerNote} onChange={(event) => setOwnerNote(event.target.value)} placeholder="Optional note before approving" />
              </label>

              <footer className="freshCommandFormActions">
                <button type="submit" disabled={busy === "approve" || busy === "prepare" || (!selectedHasConcreteAction && selected.sourceMode !== "note")}>
                  {busy === "approve" || busy === "prepare" ? "Working..." : selected.sourceMode === "note" ? "Prepare form" : "Approve form"}
                </button>
                <button type="button" disabled={!selected || selected.sourceMode !== "backend" || busy === "save"} onClick={saveSelected}>{busy === "save" ? "Saving..." : "Save edit"}</button>
                <button type="button" disabled={!selected || selected.sourceMode !== "backend" || busy === "ignore"} onClick={ignoreSelected}>{busy === "ignore" ? "Parking..." : "Park for now"}</button>
                <button type="button" disabled={!selected || selected.sourceMode === "note"} onClick={openSelectedRecord}>Open record</button>
              </footer>
            </form>
          ) : (
            <article className="freshCommandEmptyForm"><b>No approval selected</b><span>Select a queue item or run Check for work.</span></article>
          )}
        </main>

        <aside className="freshCommandSidePanel">
          <section>
            <div className="freshCommandPanelTitle"><span>Owner control</span><b>{duplicateRows.length}</b></div>
            <p>Only approve when the form is right. Churvox shows the prepared admin, the proof behind it, and the owner decision. No tax filing, no bank payout files, and no paid status without approved confirmation.</p>
            <div className="freshCommandSideActions">
              <button type="button" disabled={!duplicateRows.length || busy === "dedupe"} onClick={archiveDuplicateApprovals}>{busy === "dedupe" ? "Archiving..." : duplicateRows.length ? `Archive ${duplicateRows.length} duplicates` : "No duplicates"}</button>
              <button type="button" disabled={!noteItems.length || busy === "prepare"} onClick={prepareNotes}>{busy === "prepare" ? "Preparing..." : "Prepare notes"}</button>
            </div>
          </section>
          <section>
            <div className="freshCommandPanelTitle"><span>Recent decisions</span><b>{activity.length}</b></div>
            {activity.length ? activity.map((item) => <article className="freshCommandActivity" key={item.id}><b>{item.status} - {item.title}</b><span>{item.time}</span></article>) : <article className="freshCommandActivity"><b>No decisions yet</b><span>Approvals will appear here.</span></article>}
          </section>
        </aside>
      </section>
    </section>
  );
}
