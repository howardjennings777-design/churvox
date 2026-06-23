import React from "react";
import { useApi } from "../hooks/useApi";
import { readFreshFocus } from "./freshFocus";
import "./freshPayrollCompact.css";
import "./freshJobsPolish.css";

const commandFilters = ["Open", "Edited", "Local", "Handled", "All"];
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
];

const NON_BUSINESS_FIELDS = [
  "source",
  "category",
  "group",
  "owner_rule",
  "status",
  "created_at",
  "updated_at",
  "id",
  "_id",
  "business_id",
  "user_id",
];

function cleanString(value) {
  return String(value || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizedText(value) {
  return cleanString(value).toLowerCase();
}

function isGenericReviewText(value) {
  const text = normalizedText(value);
  if (!text) return true;
  return GENERIC_REVIEW_PHRASES.some((phrase) => text === phrase || text.includes(phrase));
}

function usefulValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      const text = value.map((item) => usefulValue(item)).filter(Boolean).join(". ");
      return isGenericReviewText(text) ? "" : text;
    }
    const text = Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
      .map(([key, v]) => `${cleanString(key)}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join(". ");
    return isGenericReviewText(text) ? "" : text;
  }
  const text = cleanString(value);
  return isGenericReviewText(text) ? "" : text;
}

function hasUsefulObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).some(([key, v]) => {
    const label = normalizedText(key);
    if (NON_BUSINESS_FIELDS.includes(label)) return false;
    return Boolean(usefulValue(v));
  });
}

function hasPreparedText(item) {
  return Boolean(usefulValue(
    item?.prepared ||
    item?.draft ||
    item?.next_action ||
    item?.recommended_action ||
    item?.approval_action ||
    item?.message_text ||
    item?.prepared_message
  ));
}

function hasConcretePreparedAction(item) {
  if (!item) return false;
  if (item.sourceMode === "local") return true;

  const action = normalizedText(item.action || item.type);
  if (["needs clarification", "needs preparation", "not prepared", "other"].includes(action)) return false;

  if (hasPreparedText(item)) return true;
  if (hasUsefulObject(item.payload) || hasUsefulObject(item.details) || hasUsefulObject(item.preview)) return true;
  return false;
}

function asArray(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.review_items)) return data.review_items;
  if (Array.isArray(data?.data)) return data.data;
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
  return item?.preparedForApproval === false ? "Not ready" : "Ready to approve";
}

function summaryOf(item) {
  const summary = usefulValue(item?.summary || item?.message || item?.description || item?.original_text);
  if (summary) return summary;
  if (item?.preparedForApproval === false) return "This is not ready for approval yet.";
  return "Ready for your decision.";
}

function statusOf(item) {
  return String(item?.status || "open").trim().toLowerCase();
}

function categoryOf(item) {
  return item?.category || item?.group || item?.source || "review";
}

function readLegacyInbox() {
  try {
    if (typeof window === "undefined") return [];

    return LEGACY_INBOX_KEYS.flatMap((key) => {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item, index) => ({ ...item, localKey: key, localIndex: index, localOnly: true }));
    });
  } catch {
    return [];
  }
}

function clearLegacyInbox() {
  try {
    if (typeof window === "undefined") return;
    LEGACY_INBOX_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Keep Command usable without local storage.
  }
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
  const details = item?.details && typeof item.details === "object"
    ? Object.entries(item.details).map(([key, value]) => `${key}: ${value}`).join(". ")
    : "";
  const payload = item?.payload && typeof item.payload === "object"
    ? Object.entries(item.payload).map(([key, value]) => `${key}: ${value}`).join(". ")
    : "";

  return [
    item?.title,
    item?.summary,
    item?.info,
    item?.found,
    item?.prepared,
    item?.why,
    item?.owner,
    details,
    payload,
  ].filter(Boolean).join(". ");
}

function objectRows(label, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value)
    .map(([key, v]) => ({ label: `${label}: ${cleanString(key)}`, value: usefulValue(v) }))
    .filter((row) => row.value);
}

function detailRows(item) {
  if (!item) return [];
  if (item.preparedForApproval === false) {
    return [{
      label: "Not ready",
      value: "Churvox has not prepared a clear action for this yet.",
    }];
  }

  const rows = [];
  const found = usefulValue(item?.found || item?.matched_record || item?.source_record);
  const prepared = usefulValue(item?.prepared || item?.draft || item?.next_action || item?.recommended_action || item?.approval_action || item?.message_text || item?.prepared_message);
  const reason = usefulValue(item?.why || item?.reason);
  const owner = usefulValue(item?.owner || item?.owner_note || item?.owner_instruction);

  if (found) rows.push({ label: "What Churvox found", value: found });
  if (prepared) rows.push({ label: "Ready for you", value: prepared });
  rows.push(...objectRows("Draft", item?.draft));
  rows.push(...objectRows("Details", item?.payload));
  rows.push(...objectRows("Details", item?.details));
  rows.push(...objectRows("Preview", item?.preview));
  if (reason) rows.push({ label: "Why this matters", value: reason });
  if (owner) rows.push({ label: "Your note", value: owner });

  return rows.length ? rows : [{ label: "Ready for you", value: summaryOf(item) }];
}

const selectedFilterButtonStyle = {
  background: "#f97316",
  backgroundColor: "#f97316",
  borderColor: "#f97316",
  color: "#111827",
  WebkitTextFillColor: "#111827",
  opacity: 1,
  fontWeight: 950,
};

const selectedFilterTextStyle = {
  color: "#111827",
  WebkitTextFillColor: "#111827",
  opacity: 1,
  fontWeight: 950,
};

const selectedFilterCountStyle = {
  background: "#111827",
  backgroundColor: "#111827",
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
  opacity: 1,
  fontWeight: 950,
  borderRadius: "999px",
};

export default function FreshCommand({ onNavigate }) {
  const { get, post, patch } = useApi();
  const [backendItems, setBackendItems] = React.useState([]);
  const [localItems, setLocalItems] = React.useState(readLegacyInbox);
  const [selectedId, setSelectedId] = React.useState(() => readFreshFocus("command", ""));
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
  const localRows = localItems.map((item) => ({ ...item, sourceMode: "local", listStatus: "local", preparedForApproval: true }));
  const rows = [...preparedBackendRows, ...localRows, ...diagnosticRows];

  const visibleRows = rows.filter((item) => {
    if (filter === "All") return true;
    if (filter === "Local") return item.sourceMode === "local";
    if (filter === "Handled") return item.sourceMode === "backend" && ["approved", "ignored", "declined", "closed"].includes(item.listStatus);
    if (filter === "Edited") return item.sourceMode === "backend" && item.preparedForApproval && item.listStatus === "edited";
    return item.sourceMode === "backend" && item.preparedForApproval && ["open", "edited"].includes(item.listStatus);
  });

  const selected = visibleRows.find((item) => `${item.sourceMode}-${idOf(item.id || item._id, item.localIndex)}` === selectedId) || visibleRows[0] || null;
  const selectedKey = selected ? `${selected.sourceMode}-${idOf(selected.id || selected._id, selected.localIndex)}` : "";
  const selectedHasConcreteAction = Boolean(selected?.sourceMode === "backend" && selected.preparedForApproval);
  const selectedDiagnosticOnly = Boolean(selected?.sourceMode === "backend" && !selected.preparedForApproval);

  const counts = {
    Open: preparedBackendRows.filter((item) => ["open", "edited"].includes(item.listStatus)).length,
    Edited: preparedBackendRows.filter((item) => item.listStatus === "edited").length,
    Local: localRows.length,
    Handled: backendRows.filter((item) => ["approved", "ignored", "declined", "closed"].includes(item.listStatus)).length,
    All: rows.length,
  };

  const moneyWatched = preparedBackendRows.filter((item) => String(item.category || item.action || "").toLowerCase().includes("money") || String(item.category || item.action || "").toLowerCase().includes("invoice") || String(item.category || item.action || "").toLowerCase().includes("payment")).length;

  const loadReview = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await get("/ai-review-items?limit=200", { timeout: 25000 });
      if (!result?.success) throw new Error(result?.error || "Command is protected or not ready.");
      const next = asArray(result.data ?? result);
      const readyCount = next.filter((item) => hasConcretePreparedAction({ ...item, sourceMode: "backend" })).length;
      const waitingCount = Math.max(0, next.length - readyCount);
      setBackendItems(next);
      if (readyCount) {
        setMessage(`${readyCount} item${readyCount === 1 ? "" : "s"} ready for your decision.`);
      } else if (waitingCount) {
        setMessage("Nothing is ready for approval yet.");
      } else {
        setMessage("No work waiting for you right now.");
      }
    } catch (err) {
      setBackendItems([]);
      setMessage(err?.message || "Command is protected or not ready.");
    } finally {
      setLocalItems(readLegacyInbox());
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => { loadReview(); }, [loadReview]);

  React.useEffect(() => {
    const refresh = () => {
      setLocalItems(readLegacyInbox());
      loadReview();
    };
    window.addEventListener("churvox:fresh-data-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("churvox:fresh-data-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadReview]);

  React.useEffect(() => {
    setOwnerNote(selected?.owner_note || selected?.owner || "");
  }, [selectedKey]);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(COMMAND_ACTIVITY_KEY, JSON.stringify(activity));
    } catch {
      // Keep page usable without local storage.
    }
  }, [activity]);

  function addActivity(title, status) {
    setActivity((current) => [{
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      status,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }, ...current].slice(0, 10));
  }

  async function approveSelected() {
    if (!selected || !selectedHasConcreteAction) return;
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

  async function promoteLocalItems() {
    if (!localItems.length) {
      setMessage("No saved browser notes to move into Command.");
      return;
    }

    setBusy("promote");
    let promoted = 0;
    let failed = 0;

    for (const item of localItems.slice(0, 20)) {
      try {
        const text = legacyText(item) || titleOf(item);
        const result = await post("/tell-churvox/prepare", { text }, { timeout: 30000 });
        if (result?.success) promoted += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }

    if (promoted) clearLegacyInbox();
    setLocalItems(readLegacyInbox());
    addActivity("Saved notes moved in", promoted ? "Moved" : "Failed");
    setMessage(promoted ? `Moved ${promoted} saved note${promoted === 1 ? "" : "s"} into Command.${failed ? ` ${failed} failed.` : ""}` : "Could not move saved notes into Command.");
    setBusy("");
    await loadReview();
  }

  async function scanBackendRisks() {
    setBusy("scan");
    try {
      const text = "Prepare completed admin work for owner approval from real Churvox records. Return only concrete approval-ready items: draft invoice from completed job, payment follow-up message for unpaid invoice, quote follow-up message, client detail request, worker acknowledgement reminder, payroll review summary, or Xero draft sync check. Each item must include the exact record, customer or worker, amount/date/status where relevant, and the prepared draft/message/change. Do not create explanation-only or needs-clarification cards. Owner approval required. Do not send invoices, file tax, create bank payout files, or mark paid automatically.";
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

  function openSelectedArea() {
    if (!selected) return;
    onNavigate?.(actionPage(selected));
  }

  return (
    <section className="freshCommandStablePage freshPayrollCompactPage">
      <header className="freshHero">
        <span>Command</span>
        <h1>Ready for approval</h1>
        <p>Churvox does the admin first. You approve, edit, ignore, or open the job it came from.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard"><h2>{loading ? "..." : counts.Open}</h2><p>Waiting for you</p></aside>
        <aside className="freshCard"><h2>{loading ? "..." : counts.Local}</h2><p>Saved notes</p></aside>
        <aside className="freshCard"><h2>{loading ? "..." : moneyWatched}</h2><p>Money items</p></aside>
      </section>

      {message ? <section className="freshBackendReviewSource" data-review-source="backend"><div><span>Your approval queue</span><h2>{message}</h2><p>Only clear, ready-to-approve work appears in Open.</p></div><aside><b>{counts.Open}</b><small>waiting</small></aside></section> : null}

      <section className="freshCommandFilterBar">
        {commandFilters.map((item) => (
          <button type="button" key={item} className={filter === item ? "commandFilterSelected" : ""} style={filter === item ? selectedFilterButtonStyle : undefined} onClick={() => setFilter(item)}>
            <span style={filter === item ? selectedFilterTextStyle : undefined}>{item}</span>
            <b style={filter === item ? selectedFilterCountStyle : undefined}>{counts[item] ?? rows.length}</b>
          </button>
        ))}
      </section>

      <section className="freshGrid">
        <aside className="freshCard freshJobsListCard">
          <h2>{filter === "All" ? "All items" : "Waiting for approval"}</h2>
          {loading && !visibleRows.length ? <div className="freshItem"><b>Checking...</b><span>Looking for work waiting on you.</span></div> : null}
          {!loading && !visibleRows.length ? <div className="freshItem"><b>Nothing waiting here</b><span>Run Check for work or move saved notes into Command.</span></div> : null}
          {visibleRows.map((item, index) => {
            const key = `${item.sourceMode}-${idOf(item.id || item._id, item.localIndex ?? index)}`;
            const diagnostic = item.sourceMode === "backend" && !item.preparedForApproval;
            return (
              <button type="button" className={`freshItem ${selectedKey === key ? "active" : ""} ${item.sourceMode === "local" || diagnostic ? "need" : ""}`} key={key} onClick={() => setSelectedId(key)}>
                <b>{titleOf(item)}</b>
                <span>{item.sourceMode === "local" ? "saved note" : diagnostic ? "not ready" : "ready"} - {summaryOf(item)}</span>
              </button>
            );
          })}
        </aside>

        <section className="freshCard freshJobsDetailCard">
          <div className="freshJobsDetailHeader">
            <div><small>{selected?.sourceMode === "local" ? "Saved note" : selectedDiagnosticOnly ? "Not ready" : "Ready for your decision"}</small><h2>{selected ? titleOf(selected) : "Nothing selected"}</h2></div>
            {selected ? <span className={selected.sourceMode === "local" || selectedDiagnosticOnly ? "need" : "ready"}>{selected.sourceMode === "local" ? "Move first" : selectedDiagnosticOnly ? "Not ready" : "Ready"}</span> : null}
          </div>

          {selected ? (
            <>
              <div className="freshMiniGrid freshJobsMiniGrid">
                <div><span>From</span><b>{selected.sourceMode === "local" ? "Saved note" : "Churvox"}</b></div>
                <div><span>Type</span><b>{categoryOf(selected)}</b></div>
                <div><span>What will happen</span><b>{selectedDiagnosticOnly ? "Nothing yet" : readableAction(selected.action || selected.type)}</b></div>
                <div><span>Your choice</span><b>{selected.sourceMode === "local" ? "Move into Command" : selectedDiagnosticOnly ? "Skip for now" : "Approve, edit, or ignore"}</b></div>
              </div>

              <section className="freshJobsDetailBox notes"><span>Summary</span><p>{summaryOf(selected)}</p></section>
              {detailRows(selected).map((row) => <section className="freshJobsDetailBox notes" key={row.label}><span>{row.label}</span><p>{row.value}</p></section>)}

              <label className="freshField"><span>Your note / edit</span><textarea value={ownerNote} onChange={(event) => setOwnerNote(event.target.value)} placeholder="Add a note, edit instruction, or reason for ignoring" /></label>
            </>
          ) : <div className="freshItem"><b>Nothing waiting</b><span>When Churvox has a real draft, message, job change, or invoice check ready, it will appear here.</span></div>}
        </section>

        <aside className="freshCard freshJobsActionsCard">
          <h2>Your controls</h2>
          <p className="freshJobsActionHint">Nothing changes until you approve it.</p>
          <div className="freshActions freshJobsActionStack">
            <button className="freshPrimary" type="button" disabled={!selectedHasConcreteAction || busy === "approve"} onClick={approveSelected}>{busy === "approve" ? "Approving..." : selectedDiagnosticOnly ? "Not ready" : "Approve"}</button>
            <button className="freshDark" type="button" disabled={!selected || selected.sourceMode !== "backend" || busy === "save"} onClick={saveSelected}>{busy === "save" ? "Saving..." : "Save edit"}</button>
            <button className="freshGhost" type="button" disabled={!selected || selected.sourceMode !== "backend" || busy === "ignore"} onClick={ignoreSelected}>Ignore</button>
            <button className="freshOrange" type="button" disabled={!localItems.length || busy === "promote"} onClick={promoteLocalItems}>{busy === "promote" ? "Moving..." : "Move saved notes"}</button>
            <button className="freshDark" type="button" disabled={busy === "scan"} onClick={scanBackendRisks}>{busy === "scan" ? "Checking..." : "Check for work"}</button>
            <button className="freshGhost" type="button" disabled={!selected} onClick={openSelectedArea}>Open source</button>
            <button className="freshGhost" type="button" onClick={loadReview}>Refresh</button>
          </div>
        </aside>
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard"><h2>Safety rule</h2><p>Churvox can prepare draft invoices and checks. It will not send invoices, file tax, create bank payout files, or mark anything paid unless you approve the allowed action.</p></section>
        <aside className="freshCard"><h2>Recent decisions</h2>{activity.length ? activity.map((item) => <div className="freshItem freshActivityItem" key={item.id}><b>{item.status} - {item.title}</b><span>{item.time}</span></div>) : <div className="freshItem"><b>No decisions yet</b><span>Approve, edit, ignore, check for work, or move saved notes to create activity.</span></div>}</aside>
      </section>
    </section>
  );
}
