import React from "react";
import { useApi } from "../hooks/useApi";
import FreshCommandOperatingSystem from "./FreshCommandOperatingSystem";
import "./freshPayrollCompact.css";
import "./freshJobsPolish.css";

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
  if (!text) return "Ready to approve";
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

function collectDetailFields(value, seen = new Set()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, raw]) => {
    if (!shouldShowDetailField(key, raw)) return [];
    const val = usefulValue(raw);
    if (!val) return [];
    const dedupeKey = `${displayLabel(key)}:${val}`.toLowerCase();
    if (seen.has(dedupeKey)) return [];
    seen.add(dedupeKey);
    return [{ label: displayLabel(key), value: val }];
  });
}

function compactDetails(item) {
  const seen = new Set();
  return [
    ...collectDetailFields(item?.payload, seen),
    ...collectDetailFields(item?.details, seen),
    ...collectDetailFields(item?.preview, seen),
    ...collectDetailFields(typeof item?.draft === "object" ? item.draft : null, seen),
  ].slice(0, 5);
}

function detailRows(item) {
  if (!item) return [];
  if (item.preparedForApproval === false) return [{ label: "Needs work", value: "This is not shown in Open because no clear action is ready yet." }];
  const rows = [];
  const summary = summaryOf(item);
  const details = compactDetails(item);
  const prepared = usefulValue(item?.prepared || item?.draft || item?.next_action || item?.recommended_action || item?.approval_action || item?.message_text || item?.prepared_message);
  const reason = usefulValue(item?.why || item?.reason);
  if (details.length) rows.push({ label: "Record", value: details.map((row) => `${row.label}: ${row.value}`).join(" - ") });
  if (prepared && !sameMeaning(prepared, summary) && !sameMeaning(prepared, rows[0]?.value)) rows.push({ label: "Prepared action", value: prepared });
  if (reason && !sameMeaning(reason, summary) && !sameMeaning(reason, prepared)) rows.push({ label: "Owner check", value: reason });
  return rows.length ? rows : [{ label: "Ready", value: summary }];
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
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
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

const selectedFilterButtonStyle = { background: "#f97316", backgroundColor: "#f97316", borderColor: "#f97316", color: "#111827", WebkitTextFillColor: "#111827", opacity: 1, fontWeight: 950 };
const selectedFilterTextStyle = { color: "#111827", WebkitTextFillColor: "#111827", opacity: 1, fontWeight: 950 };
const selectedFilterCountStyle = { background: "#111827", backgroundColor: "#111827", color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1, fontWeight: 950, borderRadius: "999px" };

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

  const selected = visibleRows.find((item) => `${item.sourceMode}-${idOf(item.id || item._id, item.localIndex)}` === selectedId) || visibleRows[0] || null;
  const selectedKey = selected ? `${selected.sourceMode}-${idOf(selected.id || selected._id, selected.localIndex)}` : "";
  const selectedHasConcreteAction = Boolean(selected?.sourceMode === "backend" && selected.preparedForApproval);
  const selectedDiagnosticOnly = Boolean(selected?.sourceMode === "backend" && !selected.preparedForApproval);
  const selectedApprovalDetails = approvalDetailRows(selected);
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
  React.useEffect(() => { setOwnerNote(selected?.owner_note || selected?.owner || ""); }, [selectedKey, selected]);
  React.useEffect(() => {
    try { if (typeof window !== "undefined") window.localStorage.setItem(COMMAND_ACTIVITY_KEY, JSON.stringify(activity)); } catch {}
  }, [activity]);

  function addActivity(title, status) {
    setActivity((current) => [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title, status, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...current].slice(0, 10));
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
      if (!result?.success) throw new Error(result?.error || "Could not ignore this.");
      addActivity(titleOf(selected), "Ignored");
      setMessage("Ignored. Nothing was changed.");
      setSelectedId("");
      await loadReview();
    } catch (err) {
      setMessage(err?.message || "Could not ignore this.");
    } finally {
      setBusy("");
    }
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
    <section className="freshCommandStablePage freshPayrollCompactPage">
      <header className="freshHero">
        <span>Command</span>
        <h1>Ready for approval</h1>
        <p>Churvox does the admin first. You approve, edit, ignore, or open the record it came from.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard"><h2>{loading ? "..." : counts.Open}</h2><p>Waiting for you</p></aside>
        <aside className="freshCard"><h2>{loading ? "..." : counts.Notes}</h2><p>Notes to prepare</p></aside>
        <aside className="freshCard"><h2>{loading ? "..." : moneyWatched}</h2><p>Money items</p></aside>
      </section>

      <FreshCommandOperatingSystem
        selected={selected}
        selectedApprovalDetails={selectedApprovalDetails}
        selectedHasConcreteAction={selectedHasConcreteAction}
        selectedDiagnosticOnly={selectedDiagnosticOnly}
        preparedBackendRows={preparedBackendRows}
        noteRows={noteRows}
        moneyWatched={moneyWatched}
        counts={counts}
        detailRows={detailRows}
        summaryOf={summaryOf}
        readableAction={readableAction}
        categoryOf={categoryOf}
      />

      {message ? <section className="freshBackendReviewSource" data-review-source="backend"><div><span>Your approval queue</span><h2>{message}</h2><p>Only clear, ready-to-approve work appears in Open.</p></div><aside><b>{counts.Open}</b><small>waiting</small></aside></section> : null}

      <section className="freshCommandFilterBar">
        {commandFilters.map((item) => <button type="button" key={item} className={filter === item ? "commandFilterSelected" : ""} style={filter === item ? selectedFilterButtonStyle : undefined} onClick={() => setFilter(item)}><span style={filter === item ? selectedFilterTextStyle : undefined}>{item}</span><b style={filter === item ? selectedFilterCountStyle : undefined}>{counts[item] ?? rows.length}</b></button>)}
      </section>

      <section className="freshGrid">
        <aside className="freshCard freshJobsListCard">
          <h2>{filter === "All" ? "All items" : filter === "Notes" ? "Notes to prepare" : "Waiting for approval"}</h2>
          {loading && !visibleRows.length ? <div className="freshItem"><b>Checking...</b><span>Looking for work waiting on you.</span></div> : null}
          {!loading && !visibleRows.length ? <div className="freshItem"><b>Nothing waiting here</b><span>Run Check for work when you want Churvox to prepare the next admin actions.</span></div> : null}
          {visibleRows.map((item, index) => {
            const key = `${item.sourceMode}-${idOf(item.id || item._id, item.localIndex ?? index)}`;
            const diagnostic = item.sourceMode === "backend" && !item.preparedForApproval;
            return <button type="button" className={`freshItem ${selectedKey === key ? "active" : ""} ${item.sourceMode === "note" || diagnostic ? "need" : ""}`} key={key} onClick={() => setSelectedId(key)}><b>{titleOf(item)}</b><span>{item.sourceMode === "note" ? "note to prepare" : diagnostic ? "needs preparation" : "ready"} - {summaryOf(item)}</span></button>;
          })}
        </aside>

        <section className="freshCard freshJobsDetailCard">
          <div className="freshJobsDetailHeader"><div><small>{selected?.sourceMode === "note" ? "Note to prepare" : selectedDiagnosticOnly ? "Needs preparation" : "Ready for your decision"}</small><h2>{selected ? titleOf(selected) : "Nothing selected"}</h2></div>{selected ? <span className={selected.sourceMode === "note" || selectedDiagnosticOnly ? "need" : "ready"}>{selected.sourceMode === "note" ? "Prepare" : selectedDiagnosticOnly ? "Needs work" : "Ready"}</span> : null}</div>
          {selected ? <>
            <div className="freshMiniGrid freshJobsMiniGrid"><div><span>Type</span><b>{categoryOf(selected)}</b></div><div><span>Action</span><b>{selectedDiagnosticOnly ? "Not ready yet" : readableAction(selected.action || selected.type)}</b></div><div><span>Status</span><b>{selected.sourceMode === "note" ? "Note" : selectedDiagnosticOnly ? "Needs preparation" : "Ready"}</b></div><div><span>Decision</span><b>{selected.sourceMode === "note" ? "Prepare first" : selectedDiagnosticOnly ? "Skip" : "Approve or edit"}</b></div></div>
            {selectedApprovalDetails.length ? <section className="freshJobsDetailBox notes freshCommandApprovalDetails"><span>Job approval details</span><div>{selectedApprovalDetails.map((row) => <article key={`${row.label}-${row.value}`}><small>{row.label}</small><b>{row.value}</b></article>)}</div></section> : null}
            <section className="freshJobsDetailBox notes"><span>Summary</span><p>{summaryOf(selected)}</p></section>
            {detailRows(selected).map((row) => <section className="freshJobsDetailBox notes" key={row.label}><span>{row.label}</span><p>{row.value}</p></section>)}
            <label className="freshField"><span>Your note / edit</span><textarea value={ownerNote} onChange={(event) => setOwnerNote(event.target.value)} placeholder="Optional note before approving or ignoring" /></label>
          </> : <div className="freshItem"><b>Nothing waiting</b><span>When Churvox has a real draft, message, job change, or invoice check ready, it will appear here.</span></div>}
        </section>

        <aside className="freshCard freshJobsActionsCard"><h2>Your controls</h2><p className="freshJobsActionHint">Nothing changes until you approve it.</p><div className="freshActions freshJobsActionStack"><button className="freshPrimary" type="button" disabled={!selectedHasConcreteAction || busy === "approve"} onClick={approveSelected}>{busy === "approve" ? "Approving..." : selectedDiagnosticOnly ? "Not ready" : "Approve"}</button><button className="freshDark" type="button" disabled={!selected || selected.sourceMode !== "backend" || busy === "save"} onClick={saveSelected}>{busy === "save" ? "Saving..." : "Save edit"}</button><button className="freshGhost" type="button" disabled={!selected || selected.sourceMode !== "backend" || busy === "ignore"} onClick={ignoreSelected}>Ignore</button><button className="freshOrange" type="button" disabled={!noteItems.length || busy === "prepare"} onClick={prepareNotes}>{busy === "prepare" ? "Preparing..." : "Prepare notes"}</button><button className="freshDark" type="button" disabled={busy === "scan"} onClick={checkForWork}>{busy === "scan" ? "Checking..." : "Check for work"}</button><button className="freshGhost" type="button" disabled={!selected || selected.sourceMode === "note"} onClick={openSelectedRecord}>Open record</button><button className="freshGhost" type="button" onClick={loadReview}>Refresh</button></div></aside>
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}><section className="freshCard"><h2>Safety rule</h2><p>Churvox can prepare draft invoices and checks. It will not send invoices, file tax, create bank payout files, or mark anything paid unless you approve the allowed action.</p></section><aside className="freshCard"><h2>Recent decisions</h2>{activity.length ? activity.map((item) => <div className="freshItem freshActivityItem" key={item.id}><b>{item.status} - {item.title}</b><span>{item.time}</span></div>) : <div className="freshItem"><b>No decisions yet</b><span>Approve, edit, ignore, check for work, or prepare notes to create activity.</span></div>}</aside></section>
    </section>
  );
}
