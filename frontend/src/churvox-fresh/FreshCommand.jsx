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

function titleOf(item) {
  const title = usefulValue(item?.title || item?.summary);
  if (title) return title;
  const category = usefulValue(item?.category || item?.group);
  const action = usefulValue(item?.action || item?.type);
  if (category || action) return [category, action].filter(Boolean).join(" - ");
  return item?.preparedForApproval === false ? "Scan diagnostic" : "Prepared admin action";
}

function summaryOf(item) {
  const summary = usefulValue(item?.summary || item?.message || item?.description || item?.original_text);
  if (summary) return summary;
  if (item?.preparedForApproval === false) return "Hidden from the owner approval queue because it is not a concrete prepared action.";
  return "Prepared for owner approval.";
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
      label: "Diagnostic only",
      value: "This backend row is not shown as owner work because Churvox has not prepared a concrete draft, message, record change, amount, date, or next action for approval.",
    }];
  }

  const rows = [];
  const found = usefulValue(item?.found || item?.matched_record || item?.source_record);
  const prepared = usefulValue(item?.prepared || item?.draft || item?.next_action || item?.recommended_action || item?.approval_action || item?.message_text || item?.prepared_message);
  const reason = usefulValue(item?.why || item?.reason);
  const owner = usefulValue(item?.owner || item?.owner_note || item?.owner_instruction);

  if (found) rows.push({ label: "Record found", value: found });
  if (prepared) rows.push({ label: "Prepared action", value: prepared });
  rows.push(...objectRows("Draft", item?.draft));
  rows.push(...objectRows("Prepared fields", item?.payload));
  rows.push(...objectRows("Prepared fields", item?.details));
  rows.push(...objectRows("Preview", item?.preview));
  if (reason) rows.push({ label: "Why approval is needed", value: reason });
  if (owner) rows.push({ label: "Owner instruction", value: owner });

  return rows.length ? rows : [{ label: "Prepared action", value: summaryOf(item) }];
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
  const [message, setMessage] = React.useState("Checking prepared admin.");
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
      if (!result?.success) throw new Error(result?.error || "Backend Review is protected or not ready.");
      const next = asArray(result.data ?? result);
      const preparedCount = next.filter((item) => hasConcretePreparedAction({ ...item, sourceMode: "backend" })).length;
      const hiddenCount = Math.max(0, next.length - preparedCount);
      setBackendItems(next);
      if (preparedCount) {
        setMessage(`${preparedCount} prepared admin action${preparedCount === 1 ? "" : "s"} ready for owner approval.${hiddenCount ? ` ${hiddenCount} diagnostic row${hiddenCount === 1 ? "" : "s"} hidden from Open.` : ""}`);
      } else if (hiddenCount) {
        setMessage(`No prepared admin waiting. ${hiddenCount} backend diagnostic row${hiddenCount === 1 ? "" : "s"} hidden from the owner approval queue.`);
      } else {
        setMessage("No prepared admin waiting right now.");
      }
    } catch (err) {
      setBackendItems([]);
      setMessage(err?.message || "Backend Review is protected or not ready.");
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
      if (!result?.success) throw new Error(result?.error || "Could not approve prepared action.");
      addActivity(titleOf(selected), "Approved");
      setMessage("Approved. Churvox executed the owner-approved backend action.");
      setSelectedId("");
      await loadReview();
    } catch (err) {
      setMessage(err?.message || "Could not approve prepared action.");
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
      if (!result?.success) throw new Error(result?.error || "Could not save owner edit.");
      addActivity(titleOf(selected), "Edited");
      setMessage("Saved. Prepared admin stays owner-controlled.");
      await loadReview();
    } catch (err) {
      setMessage(err?.message || "Could not save owner edit.");
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
      if (!result?.success) throw new Error(result?.error || "Could not ignore item.");
      addActivity(titleOf(selected), "Ignored");
      setMessage("Ignored. No action was executed.");
      setSelectedId("");
      await loadReview();
    } catch (err) {
      setMessage(err?.message || "Could not ignore item.");
    } finally {
      setBusy("");
    }
  }

  async function promoteLocalItems() {
    if (!localItems.length) {
      setMessage("No browser-only slips to promote.");
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
    addActivity("Browser slips promoted", promoted ? "Promoted" : "Failed");
    setMessage(promoted ? `Promoted ${promoted} local slip${promoted === 1 ? "" : "s"}. Only concrete prepared actions will appear in Open.${failed ? ` ${failed} failed.` : ""}` : "Could not promote local slips into prepared admin.");
    setBusy("");
    await loadReview();
  }

  async function scanBackendRisks() {
    setBusy("scan");
    try {
      const text = "Prepare completed admin work for owner approval from real Churvox records. Return only concrete approval-ready items: draft invoice from completed job, payment follow-up message for unpaid invoice, quote follow-up message, client detail request, worker acknowledgement reminder, payroll review summary, or Xero draft sync check. Each item must include the exact record, customer or worker, amount/date/status where relevant, and the prepared draft/message/change. Do not create explanation-only or needs-clarification cards. Owner approval required. Do not send invoices, file tax, create bank payout files, or mark paid automatically.";
      const result = await post("/tell-churvox/prepare", { text }, { timeout: 30000 });
      if (!result?.success) throw new Error(result?.error || "Could not prepare backend admin scan.");
      addActivity("Backend admin scan", "Prepared");
      setMessage("Backend scan finished. Command will show only concrete prepared admin actions in Open.");
      await loadReview();
    } catch (err) {
      setMessage(err?.message || "Could not prepare backend admin scan.");
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
        <span>Churvox fresh - Command</span>
        <h1>Command</h1>
        <p>Churvox prepares the admin. The owner approves, edits, ignores, or opens the source record.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard"><h2>{loading ? "..." : counts.Open}</h2><p>Prepared admin actions</p></aside>
        <aside className="freshCard"><h2>{loading ? "..." : counts.Local}</h2><p>Browser slips to promote</p></aside>
        <aside className="freshCard"><h2>{loading ? "..." : moneyWatched}</h2><p>Money actions ready</p></aside>
      </section>

      {message ? <section className="freshBackendReviewSource" data-review-source="backend"><div><span>Backend-owned approval queue</span><h2>{message}</h2><p>Open only shows real prepared admin. Generic scan diagnostics stay out of the owner approval flow.</p></div><aside><b>{counts.Open}</b><small>prepared item{counts.Open === 1 ? "" : "s"}</small></aside></section> : null}

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
          <h2>{filter === "All" ? "Prepared queue and diagnostics" : "Prepared approval queue"}</h2>
          {loading && !visibleRows.length ? <div className="freshItem"><b>Checking prepared admin...</b><span>Loading owner approval work.</span></div> : null}
          {!loading && !visibleRows.length ? <div className="freshItem"><b>No prepared admin in this filter</b><span>Run backend scan or promote browser slips. Explanation-only diagnostics stay out of Open.</span></div> : null}
          {visibleRows.map((item, index) => {
            const key = `${item.sourceMode}-${idOf(item.id || item._id, item.localIndex ?? index)}`;
            const diagnostic = item.sourceMode === "backend" && !item.preparedForApproval;
            return (
              <button type="button" className={`freshItem ${selectedKey === key ? "active" : ""} ${item.sourceMode === "local" || diagnostic ? "need" : ""}`} key={key} onClick={() => setSelectedId(key)}>
                <b>{titleOf(item)}</b>
                <span>{categoryOf(item)} - {item.sourceMode === "local" ? "browser-only" : diagnostic ? "diagnostic only" : statusOf(item)} - {summaryOf(item)}</span>
              </button>
            );
          })}
        </aside>

        <section className="freshCard freshJobsDetailCard">
          <div className="freshJobsDetailHeader">
            <div><small>{selected?.sourceMode === "local" ? "Browser-only slip" : selectedDiagnosticOnly ? "Backend diagnostic" : "Prepared backend action"}</small><h2>{selected ? titleOf(selected) : "No prepared admin selected"}</h2></div>
            {selected ? <span className={selected.sourceMode === "local" || selectedDiagnosticOnly ? "need" : "ready"}>{selected.sourceMode === "local" ? "Promote first" : selectedDiagnosticOnly ? "Diagnostic only" : statusOf(selected)}</span> : null}
          </div>

          {selected ? (
            <>
              <div className="freshMiniGrid freshJobsMiniGrid">
                <div><span>Source</span><b>{selected.sourceMode === "local" ? "Browser slip" : "Backend"}</b></div>
                <div><span>Category</span><b>{categoryOf(selected)}</b></div>
                <div><span>Action</span><b>{selectedDiagnosticOnly ? "No approval action" : selected.action || selected.type || "prepared action"}</b></div>
                <div><span>Owner rule</span><b>{selected.sourceMode === "local" ? "Promote first" : selectedDiagnosticOnly ? "Hidden from Open" : "Approve to execute"}</b></div>
              </div>

              <section className="freshJobsDetailBox notes"><span>Summary</span><p>{summaryOf(selected)}</p></section>
              {detailRows(selected).map((row) => <section className="freshJobsDetailBox notes" key={row.label}><span>{row.label}</span><p>{row.value}</p></section>)}

              <label className="freshField"><span>Owner note / edit</span><textarea value={ownerNote} onChange={(event) => setOwnerNote(event.target.value)} placeholder="Add approval note, edit instruction, or reason for ignoring" /></label>
            </>
          ) : <div className="freshItem"><b>No prepared admin waiting</b><span>The approval panel stays empty until Churvox has a real draft, message, record change, or review summary ready for you.</span></div>}
        </section>

        <aside className="freshCard freshJobsActionsCard">
          <h2>Owner controls</h2>
          <p className="freshJobsActionHint">Prepared backend actions execute only after owner approval.</p>
          <div className="freshActions freshJobsActionStack">
            <button className="freshPrimary" type="button" disabled={!selectedHasConcreteAction || busy === "approve"} onClick={approveSelected}>{busy === "approve" ? "Approving..." : selectedDiagnosticOnly ? "Diagnostic only" : "Approve prepared action"}</button>
            <button className="freshDark" type="button" disabled={!selected || selected.sourceMode !== "backend" || busy === "save"} onClick={saveSelected}>{busy === "save" ? "Saving..." : "Save edit"}</button>
            <button className="freshGhost" type="button" disabled={!selected || selected.sourceMode !== "backend" || busy === "ignore"} onClick={ignoreSelected}>Ignore</button>
            <button className="freshOrange" type="button" disabled={!localItems.length || busy === "promote"} onClick={promoteLocalItems}>{busy === "promote" ? "Promoting..." : "Promote local slips"}</button>
            <button className="freshDark" type="button" disabled={busy === "scan"} onClick={scanBackendRisks}>{busy === "scan" ? "Preparing..." : "Run backend scan"}</button>
            <button className="freshGhost" type="button" disabled={!selected} onClick={openSelectedArea}>Open source area</button>
            <button className="freshGhost" type="button" onClick={loadReview}>Refresh Review</button>
          </div>
        </aside>
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard"><h2>Safe accounting rule</h2><p>Draft invoice sync only. No automatic invoice sending, no tax filing, no bank payout files, and no automatic paid status from Command.</p></section>
        <aside className="freshCard"><h2>Owner activity</h2>{activity.length ? activity.map((item) => <div className="freshItem freshActivityItem" key={item.id}><b>{item.status} - {item.title}</b><span>{item.time}</span></div>) : <div className="freshItem"><b>No decisions yet</b><span>Approve, edit, ignore, scan, or promote to create activity.</span></div>}</aside>
      </section>
    </section>
  );
}
