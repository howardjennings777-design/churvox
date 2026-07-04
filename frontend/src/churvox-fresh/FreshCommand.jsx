import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshPayrollCompact.css";
import "./freshJobsPolish.css";
import "./freshCommandPreviewFix.css";

export const COMMAND_REPLACED_APPROVAL_PAGE_MARKER_20260627 = "COMMAND_REPLACED_APPROVAL_PAGE_MARKER_20260627";

const commandFilters = ["Open", "Edited", "Notes", "Handled", "All"];
const LEGACY_INBOX_KEYS = ["churvox:fresh-command-inbox:v1", "churvox:review-inbox:v1"];
const COMMAND_ACTIVITY_KEY = "churvox:fresh-command-activity:v1";
const EMPTY_WORDS = new Set(["", "for", "customer", "client", "none", "n/a", "na", "unknown", "undefined", "null"]);

const APPROVAL_FIELDS = [
  { label: "Customer", keys: ["customer_name", "client_name", "customer", "client", "contact_name", "name"] },
  { label: "Job", keys: ["job_title", "job_name", "title", "service", "service_type", "work_type", "job_type"] },
  { label: "Address", keys: ["service_address", "job_address", "site_address", "address", "customer_address", "client_address"] },
  { label: "Price", keys: ["price", "fixed_price", "amount", "total", "job_price", "quoted_price", "invoice_total", "quote_total"] },
  { label: "Billing", keys: ["billing_type", "pricing_type", "invoice_type", "charge_type", "rate_type"] },
  { label: "Date", keys: ["scheduled_date", "date", "due_date", "start_date", "job_date", "next_visit_date"] },
  { label: "Worker", keys: ["worker_name", "assigned_worker_name", "assigned_to_name", "assigned_worker", "team_member", "worker"] },
  { label: "Recurring", keys: ["recurring", "is_recurring", "isRecurring", "repeat", "repeats", "recurring_frequency", "frequency", "repeat_frequency", "recurrence", "recurring_rule"] },
];

function cleanText(value) {
  return String(value ?? "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").replace(/^for\s*[-:]*\s*/i, "").trim();
}

function normalizedKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function usefulValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (Array.isArray(value)) return value.map(usefulValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !["id", "_id", "business_id", "user_id", "created_at", "updated_at"].includes(normalizedKey(key)))
      .map(([key, raw]) => `${cleanText(key)}: ${usefulValue(raw)}`)
      .filter((text) => text && !EMPTY_WORDS.has(text.toLowerCase()))
      .join(". ");
  }
  const text = cleanText(value);
  return EMPTY_WORDS.has(text.toLowerCase()) ? "" : text;
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

function statusOf(item) {
  return String(item?.status || "open").trim().toLowerCase();
}

function categoryOf(item) {
  return usefulValue(item?.category || item?.group || item?.source) || "Ready for approval";
}

function readableAction(value) {
  const text = cleanText(value);
  if (!text) return "Review and approve";
  return text
    .replace(/^create job$/i, "Create job")
    .replace(/^create invoice$/i, "Create invoice")
    .replace(/^send payment followup$/i, "Send payment follow-up")
    .replace(/^prepare quote followup$/i, "Send quote follow-up");
}

function titleOf(item) {
  return usefulValue(item?.title || item?.summary || item?.action || item?.type || item?.category) || "Ready for approval";
}

function summaryOf(item) {
  return usefulValue(item?.summary || item?.message || item?.description || item?.original_text || item?.prepared || item?.draft) || "Churvox does the admin. You check the filled form and approve it.";
}

function hasConcretePreparedAction(item) {
  if (!item) return false;
  if (item.sourceMode === "note") return true;
  const action = cleanText(item.action || item.type).toLowerCase();
  if (["needs clarification", "needs preparation", "not prepared", "other"].includes(action)) return false;
  return Boolean(summaryOf(item) || usefulValue(item?.prepared || item?.draft || item?.payload || item?.details || item?.preview));
}

function findFieldValue(value, keys, depth = 0) {
  if (!value || typeof value !== "object" || depth > 5) return "";
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findFieldValue(entry, keys, depth + 1);
      if (found) return found;
    }
    return "";
  }
  const wanted = new Set(keys.map(normalizedKey));
  for (const [key, raw] of Object.entries(value)) {
    if (wanted.has(normalizedKey(key))) {
      const found = usefulValue(raw);
      if (found) return found;
    }
  }
  for (const raw of Object.values(value)) {
    if (raw && typeof raw === "object") {
      const found = findFieldValue(raw, keys, depth + 1);
      if (found) return found;
    }
  }
  return "";
}

function approvalDetailRows(item) {
  if (!item) return [];
  const sources = [item.payload, item.details, item.preview, item.form, item.raw, typeof item.draft === "object" ? item.draft : null, item].filter(Boolean);
  const rows = APPROVAL_FIELDS.map(({ label, keys }) => {
    const value = sources.map((source) => findFieldValue(source, keys)).find(Boolean) || "Not found yet";
    return { label, value };
  });
  rows.push({ label: "Action", value: readableAction(item.action || item.type || item.category || item.group) });
  return rows;
}

function buildFormRows(item, approvalRows) {
  if (!item) return [];
  return approvalRows.length ? approvalRows : [{ label: "Action", value: readableAction(item.action || item.type) }];
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
    const parsed = JSON.parse(window.localStorage.getItem(COMMAND_ACTIVITY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function actionPage(item) {
  const text = `${item?.action || ""} ${item?.category || ""} ${item?.group || ""} ${item?.page || ""}`.toLowerCase();
  if (/invoice|money/.test(text)) return "invoices";
  if (/payment|overdue/.test(text)) return "payments";
  if (/quote/.test(text)) return "quotes";
  if (/client|customer/.test(text)) return "clients";
  if (/payroll/.test(text)) return "payroll";
  if (/xero|accounting|sync/.test(text)) return "xero";
  if (/worker|dispatch|team/.test(text)) return "workercommand";
  return item?.page || "jobs";
}

function rowKey(item, index = 0) {
  return `${item.sourceMode}-${idOf(item.id || item._id, item.localIndex ?? index)}`;
}

function duplicateKey(item) {
  return `${categoryOf(item)}|${titleOf(item)}|${summaryOf(item)}`.toLowerCase().replace(/\d+/g, "#");
}

function groupCommandRows(items) {
  const groups = new Map();
  items.forEach((item, index) => {
    const key = item.sourceMode === "backend" ? duplicateKey(item) : rowKey(item, index);
    const existing = groups.get(key);
    if (existing) existing.items.push(item);
    else groups.set(key, { key, item, items: [item] });
  });
  return [...groups.values()];
}

function duplicateBackendRows(groups) {
  return groups.flatMap((group) => group.items.slice(1).filter((item) => item.sourceMode === "backend" && ["open", "edited"].includes(item.listStatus)));
}

function legacyText(item) {
  return [item?.title, item?.summary, item?.info, item?.found, item?.prepared, item?.why, item?.owner, usefulValue(item?.details), usefulValue(item?.payload)].filter(Boolean).join(". ");
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
  const visibleRows = rows.filter((item) => {
    if (filter === "All") return true;
    if (filter === "Notes") return item.sourceMode === "note";
    if (filter === "Handled") return item.sourceMode === "backend" && ["approved", "ignored", "declined", "closed"].includes(item.listStatus);
    if (filter === "Edited") return item.sourceMode === "backend" && item.preparedForApproval && item.listStatus === "edited";
    return item.sourceMode === "backend" && item.preparedForApproval && ["open", "edited"].includes(item.listStatus);
  });
  const visibleGroups = groupCommandRows(visibleRows);
  const duplicateRows = duplicateBackendRows(visibleGroups);
  const selected = visibleRows.find((item, index) => rowKey(item, index) === selectedId) || visibleGroups[0]?.item || null;
  const selectedKey = selected ? rowKey(selected) : "";
  const selectedHasConcreteAction = Boolean(selected?.sourceMode === "backend" && selected.preparedForApproval);
  const selectedDiagnosticOnly = Boolean(selected?.sourceMode === "backend" && !selected.preparedForApproval);
  const selectedApprovalDetails = approvalDetailRows(selected);
  const formRows = buildFormRows(selected, selectedApprovalDetails);
  const moneyWatched = preparedBackendRows.filter((item) => /money|invoice|payment/i.test(`${item.category || ""} ${item.action || ""}`)).length;
  const counts = {
    Open: preparedBackendRows.filter((item) => ["open", "edited"].includes(item.listStatus)).length,
    Edited: preparedBackendRows.filter((item) => item.listStatus === "edited").length,
    Notes: noteRows.length,
    Handled: backendRows.filter((item) => ["approved", "ignored", "declined", "closed"].includes(item.listStatus)).length,
    All: rows.length,
  };

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
  React.useEffect(() => { setOwnerNote(selected?.owner_note || selected?.owner || ""); }, [selectedKey, selected?.owner, selected?.owner_note]);
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
    for (const item of duplicateRows.slice(0, 75)) {
      const id = idOf(item.id || item._id);
      if (!id) continue;
      try {
        const result = await post(`/ai-review-items/${encodeURIComponent(id)}/ignore`, { note: "Archived as duplicate from grouped Command queue." }, { timeout: 25000 });
        if (result?.success) archived += 1;
      } catch {}
    }
    addActivity("Archived duplicate approvals", archived ? "Cleaned" : "No change");
    setMessage(archived ? `Archived ${archived} duplicate approval${archived === 1 ? "" : "s"}.` : "No duplicate approvals were archived.");
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
    for (const item of noteItems.slice(0, 20)) {
      try {
        const result = await post("/tell-churvox/prepare", { text: legacyText(item) || titleOf(item) }, { timeout: 30000 });
        if (result?.success) prepared += 1;
      } catch {}
    }
    if (prepared) clearLegacyInbox();
    setNoteItems(readLegacyInbox());
    addActivity("Prepared saved notes", prepared ? "Prepared" : "Failed");
    setMessage(prepared ? `Prepared ${prepared} saved note${prepared === 1 ? "" : "s"}.` : "Could not prepare saved notes.");
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
    <section className="freshCommandRebuild freshCommandApprovalCockpit" data-command-replaced={COMMAND_REPLACED_APPROVAL_PAGE_MARKER_20260627}>
      <header className="freshCommandRebuildHero freshCommandCockpitHero">
        <div>
          <span>Ready for approval</span>
          <h1>Command approval desk</h1>
          <p>Churvox does the admin. You check the filled form and approve it.</p>
        </div>
        <div className="freshCommandHeroActions">
          <button type="button" disabled={busy === "scan"} onClick={checkForWork}>{busy === "scan" ? "Checking..." : "Check for work"}</button>
          <button type="button" disabled={loading} onClick={loadReview}>Refresh</button>
        </div>
      </header>

      <section className="freshCommandStatsRow">
        <article><span>Waiting</span><b>{loading ? "..." : counts.Open}</b><small>approval queue</small></article>
        <article><span>Money</span><b>{loading ? "..." : moneyWatched}</b><small>invoice/payment checks</small></article>
        <article><span>Notes</span><b>{loading ? "..." : counts.Notes}</b><small>prepared from inbox</small></article>
        <article><span>Handled</span><b>{loading ? "..." : counts.Handled}</b><small>decision trail</small></article>
      </section>

      {message ? <section className="freshCommandStatusStrip"><b>{message}</b><span>Simple on top. Proof, memory and admin detail stay underneath until you need them.</span></section> : null}

      <section className="freshCommandMemory freshCommandMemoryExample" aria-label="Command memory example">
        <span>Memory</span>
        <b>Last time this client paid $85 for this type of job. Churvox prepared $85 again.</b>
        <small>Approve it, edit it, or park it. The owner stays in control.</small>
      </section>

      <section className="freshCommandPowerStrip" aria-label="Command approval system">
        <article><b>Admin Queue</b><span>Only what needs a decision</span></article>
        <article><b>Prepared by Churvox</b><span>Invoice, quote, message, payroll or Xero draft</span></article>
        <article><b>Proof</b><span>Job, note, photo, worker time and client</span></article>
        <article><b>Owner Decision</b><span>Approve, edit or park</span></article>
        <article><b>Memory</b><span>Past prices and owner patterns</span></article>
      </section>

      <section className="fresh/* DISABLED_CONFLICT_CommandBoard */">
        <aside className="freshCommandQueuePanel">
          <div className="freshCommandPanelTitle"><span>Approval queue</span><b>{visibleGroups.length}</b></div>
          <div className="freshCommandFilters">
            {commandFilters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}<b>{counts[item] ?? rows.length}</b></button>)}
          </div>
          <div className="freshCommandQueueList">
            {loading && !visibleGroups.length ? <article><b>Checking...</b><span>Looking for approval work.</span></article> : null}
            {!loading && !visibleGroups.length ? <article><b>Nothing waiting</b><span>Run Check for work when you want Churvox to prepare admin actions.</span></article> : null}
            {visibleGroups.map((group, index) => {
              const item = group.item;
              const key = rowKey(item, index);
              const diagnostic = item.sourceMode === "backend" && !item.preparedForApproval;
              return <button type="button" className={selectedKey === key ? "active" : ""} key={group.key} onClick={() => setSelectedId(key)}><em>{item.sourceMode === "note" ? "Note" : diagnostic ? "Needs work" : "Ready"}</em><b>{titleOf(item)}{group.items.length > 1 ? <small>x{group.items.length}</small> : null}</b><span>{summaryOf(item)}</span></button>;
            })}
          </div>
        </aside>

        <main className="freshCommandFormPanel">
          {selected ? <form onSubmit={(event) => { event.preventDefault(); approveOrPrepareSelected(); }}>
            <header className="freshCommandFormHeader"><div><span>{categoryOf(selected)}</span><h2>{titleOf(selected)}</h2></div><b>{selected.sourceMode === "note" ? "Prepare" : selectedDiagnosticOnly ? "Needs edit" : "Ready"}</b></header>
            <section className="freshCommandFilledForm" aria-label="Filled approval form">{formRows.map((row) => <label key={`${row.label}-${row.value}`}><span>{row.label}</span><b>{row.value}</b></label>)}</section>
            <label className="freshCommandOwnerEdit"><span>Owner note / edit</span><textarea value={ownerNote} onChange={(event) => setOwnerNote(event.target.value)} placeholder="Optional note before approving" /></label>
            <footer className="freshCommandFormActions">
              <button type="submit" disabled={busy === "approve" || busy === "prepare" || (!selectedHasConcreteAction && selected.sourceMode !== "note")}>{busy === "approve" || busy === "prepare" ? "Working..." : selected.sourceMode === "note" ? "Prepare form" : "Approve form"}</button>
              <button type="button" disabled={!selected || selected.sourceMode !== "backend" || busy === "save"} onClick={saveSelected}>{busy === "save" ? "Saving..." : "Save edit"}</button>
              <button type="button" disabled={!selected || selected.sourceMode !== "backend" || busy === "ignore"} onClick={ignoreSelected}>{busy === "ignore" ? "Parking..." : "Park for now"}</button>
              <button type="button" disabled={!selected || selected.sourceMode === "note"} onClick={openSelectedRecord}>Open record</button>
            </footer>
          </form> : <article className="freshCommandEmptyForm"><b>No approval selected</b><span>Select a queue item or run Check for work.</span></article>}
        </main>

        <aside className="freshCommandSidePanel">
          <section><div className="freshCommandPanelTitle"><span>Owner control</span><b>{duplicateRows.length}</b></div><p>Only approve when the prepared admin is right. Churvox shows the draft, proof and decision. No tax filing, no bank payout files, and no paid status without approved confirmation.</p><div className="freshCommandSideActions"><button type="button" disabled={!duplicateRows.length || busy === "dedupe"} onClick={archiveDuplicateApprovals}>{busy === "dedupe" ? "Archiving..." : duplicateRows.length ? `Archive ${duplicateRows.length} duplicates` : "No duplicates"}</button><button type="button" disabled={!noteItems.length || busy === "prepare"} onClick={prepareNotes}>{busy === "prepare" ? "Preparing..." : "Prepare notes"}</button></div></section>
          <section><div className="freshCommandPanelTitle"><span>Recent decisions</span><b>{activity.length}</b></div>{activity.length ? activity.map((item) => <article className="freshCommandActivity" key={item.id}><b>{item.status} - {item.title}</b><span>{item.time}</span></article>) : <article className="freshCommandActivity"><b>No owner decisions yet</b><span>Approved, edited and parked decisions will appear here.</span></article>}</section>
        </aside>
      </section>
    </section>
  );
}
