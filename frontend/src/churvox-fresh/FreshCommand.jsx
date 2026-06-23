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
];

function cleanString(value) {
  return String(value || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function isGenericReviewText(value) {
  const text = cleanString(value).toLowerCase();
  if (!text) return true;
  return GENERIC_REVIEW_PHRASES.some((phrase) => text === phrase || text.includes(phrase));
}

function usefulValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
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
    const label = cleanString(key).toLowerCase();
    if (["source", "category", "owner_rule", "status", "created_at", "updated_at"].includes(label)) return false;
    return Boolean(usefulValue(v));
  });
}

function hasConcretePreparedAction(item) {
  if (!item) return false;
  if (item.sourceMode === "local") return true;
  if (usefulValue(item.prepared || item.draft || item.next_action || item.recommended_action)) return true;
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
  return "Review needs prepared action";
}

function summaryOf(item) {
  const summary = usefulValue(item?.summary || item?.message || item?.description || item?.original_text);
  if (summary) return summary;
  if (!hasConcretePreparedAction(item)) return "This card does not include a concrete draft, record, amount, customer, or next action yet.";
  return "Prepared for owner review.";
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
  const rows = Object.entries(value)
    .map(([key, v]) => ({ label: `${label}: ${cleanString(key)}`, value: usefulValue(v) }))
    .filter((row) => row.value);
  return rows;
}

function detailRows(item) {
  const rows = [];
  const found = usefulValue(item?.found || item?.matched_record || item?.source_record);
  const prepared = usefulValue(item?.prepared || item?.draft || item?.next_action || item?.recommended_action);
  const reason = usefulValue(item?.why || item?.reason);
  const owner = usefulValue(item?.owner || item?.owner_note || item?.owner_instruction);

  if (found) rows.push({ label: "Record / trigger found", value: found });
  if (prepared) rows.push({ label: "Prepared action", value: prepared });

  rows.push(...objectRows("Draft", item?.draft));
  rows.push(...objectRows("Prepared fields", item?.payload));
  rows.push(...objectRows("Prepared fields", item?.details));
  rows.push(...objectRows("Preview", item?.preview));

  if (reason) rows.push({ label: "Reason", value: reason });
  if (owner) rows.push({ label: "Owner instruction", value: owner });

  if (!hasConcretePreparedAction(item)) {
    return [{
      label: "Needs preparation",
      value: "Churvox has not prepared a real draft/action for this card yet. It needs a specific record, customer, amount/date, fields to change, or message text before approval.",
    }];
  }

  return rows.length ? rows : [{ label: "Review", value: summaryOf(item) }];
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
  const [message, setMessage] = React.useState("Checking backend Review.");
  const [ownerNote, setOwnerNote] = React.useState("");

  const backendRows = backendItems.map((item) => ({ ...item, sourceMode: "backend", listStatus: statusOf(item) }));
  const localRows = localItems.map((item) => ({ ...item, sourceMode: "local", listStatus: "local" }));
  const rows = [...backendRows, ...localRows];

  const visibleRows = rows.filter((item) => {
    if (filter === "All") return true;
    if (filter === "Local") return item.sourceMode === "local";
    if (filter === "Handled") return ["approved", "ignored", "declined", "closed"].includes(item.listStatus);
    if (filter === "Edited") return item.listStatus === "edited";
    return item.sourceMode === "backend" && ["open", "edited"].includes(item.listStatus);
  });

  const selected = rows.find((item) => `${item.sourceMode}-${idOf(item.id || item._id, item.localIndex)}` === selectedId) || visibleRows[0] || rows[0];
  const selectedKey = selected ? `${selected.sourceMode}-${idOf(selected.id || selected._id, selected.localIndex)}` : "";
  const selectedHasConcreteAction = selected ? hasConcretePreparedAction(selected) : false;
  const selectedNeedsPreparation = Boolean(selected && selected.sourceMode === "backend" && !selectedHasConcreteAction);

  const counts = {
    Open: backendRows.filter((item) => ["open", "edited"].includes(item.listStatus)).length,
    Edited: backendRows.filter((item) => item.listStatus === "edited").length,
    Local: localRows.length,
    Handled: backendRows.filter((item) => ["approved", "ignored", "declined", "closed"].includes(item.listStatus)).length,
    All: rows.length,
  };

  const moneyWatched = backendRows.filter((item) => String(item.category || item.action || "").toLowerCase().includes("money")).length;

  const loadReview = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await get("/ai-review-items?limit=200", { timeout: 25000 });
      if (!result?.success) throw new Error(result?.error || "Backend Review is protected or not ready.");
      const next = asArray(result.data ?? result);
      setBackendItems(next);
      setMessage(next.length ? `${next.length} backend Review item${next.length === 1 ? "" : "s"} ready.` : "Backend Review checked. No open Review items right now.");
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
    if (!selected || selected.sourceMode !== "backend" || !selectedHasConcreteAction) return;
    const id = idOf(selected.id || selected._id);
    if (!id) return;
    setBusy("approve");
    try {
      const result = await post(`/ai-review-items/${encodeURIComponent(id)}/approve`, { note: ownerNote }, { timeout: 30000 });
      if (!result?.success) throw new Error(result?.error || "Could not approve Review item.");
      addActivity(titleOf(selected), "Approved");
      setMessage("Approved. Churvox executed the owner-approved backend action.");
      setSelectedId("");
      await loadReview();
    } catch (err) {
      setMessage(err?.message || "Could not approve Review item.");
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
      if (!result?.success) throw new Error(result?.error || "Could not save Review item.");
      addActivity(titleOf(selected), "Edited");
      setMessage("Saved. Review item stays owner-controlled.");
      await loadReview();
    } catch (err) {
      setMessage(err?.message || "Could not save Review item.");
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
      if (!result?.success) throw new Error(result?.error || "Could not ignore Review item.");
      addActivity(titleOf(selected), "Ignored");
      setMessage("Ignored. No action was executed.");
      setSelectedId("");
      await loadReview();
    } catch (err) {
      setMessage(err?.message || "Could not ignore Review item.");
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
    setMessage(promoted ? `Promoted ${promoted} local slip${promoted === 1 ? "" : "s"} into backend Review.${failed ? ` ${failed} failed.` : ""}` : "Could not promote local slips into backend Review.");
    setBusy("");
    await loadReview();
  }

  async function scanBackendRisks() {
    setBusy("scan");
    try {
      const text = "Find real Churvox records that need owner action. For each review item include the exact record type and name/id, the customer or worker, the amount/date/status where relevant, the concrete draft/action prepared, and why owner approval is needed. Do not create generic explanation-only review cards. Prepare completed jobs needing draft invoices, overdue invoices needing follow-up, quotes waiting for reply, clients missing billing details, worker acknowledgement risks, payroll review items, and Xero draft sync checks. Owner approval required. Do not send invoices, do not file tax, do not create bank payout files, and do not mark paid automatically.";
      const result = await post("/tell-churvox/prepare", { text }, { timeout: 30000 });
      if (!result?.success) throw new Error(result?.error || "Could not prepare backend Review scan.");
      addActivity("Backend Review scan", "Prepared");
      setMessage("Backend Review scan prepared. Check the open item before approving anything.");
      await loadReview();
    } catch (err) {
      setMessage(err?.message || "Could not prepare backend Review scan.");
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
        <p>Real backend Review is now the main owner cockpit. Churvox prepares admin work; the owner approves, edits, ignores, or opens the source record.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard"><h2>{loading ? "..." : counts.Open}</h2><p>Backend decisions</p></aside>
        <aside className="freshCard"><h2>{loading ? "..." : counts.Local}</h2><p>Browser slips to promote</p></aside>
        <aside className="freshCard"><h2>{loading ? "..." : moneyWatched}</h2><p>Money review items</p></aside>
      </section>

      {message ? <section className="freshBackendReviewSource" data-review-source="backend"><div><span>Backend-owned Review</span><h2>{message}</h2><p>Approvals execute through backend Review endpoints. Local page handoffs can be promoted into backend Review before owner action.</p></div><aside><b>{counts.Open}</b><small>open backend item{counts.Open === 1 ? "" : "s"}</small></aside></section> : null}

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
          <h2>Review queue</h2>
          {loading && !visibleRows.length ? <div className="freshItem"><b>Checking backend Review...</b><span>Loading owner decisions.</span></div> : null}
          {!loading && !visibleRows.length ? <div className="freshItem"><b>No items in this filter</b><span>Run a backend scan or promote browser slips.</span></div> : null}
          {visibleRows.map((item, index) => {
            const key = `${item.sourceMode}-${idOf(item.id || item._id, item.localIndex ?? index)}`;
            const concrete = hasConcretePreparedAction(item);
            return (
              <button type="button" className={`freshItem ${selectedKey === key ? "active" : ""} ${item.sourceMode === "local" || !concrete ? "need" : ""}`} key={key} onClick={() => setSelectedId(key)}>
                <b>{titleOf(item)}</b>
                <span>{categoryOf(item)} - {item.sourceMode === "local" ? "browser-only" : concrete ? statusOf(item) : "needs preparation"} - {summaryOf(item)}</span>
              </button>
            );
          })}
        </aside>

        <section className="freshCard freshJobsDetailCard">
          <div className="freshJobsDetailHeader">
            <div><small>{selected?.sourceMode === "local" ? "Browser-only slip" : "Backend Review item"}</small><h2>{selected ? titleOf(selected) : "Select Review item"}</h2></div>
            {selected ? <span className={selected.sourceMode === "local" || selectedNeedsPreparation ? "need" : "ready"}>{selected.sourceMode === "local" ? "Promote first" : selectedNeedsPreparation ? "Needs preparation" : statusOf(selected)}</span> : null}
          </div>

          {selected ? (
            <>
              <div className="freshMiniGrid freshJobsMiniGrid">
                <div><span>Source</span><b>{selected.sourceMode === "local" ? "Browser slip" : "Backend"}</b></div>
                <div><span>Category</span><b>{categoryOf(selected)}</b></div>
                <div><span>Action</span><b>{selectedNeedsPreparation ? "not prepared" : selected.action || selected.type || "review"}</b></div>
                <div><span>Owner rule</span><b>{selected.sourceMode === "local" ? "Promote first" : selectedNeedsPreparation ? "Needs concrete draft" : "Approval required"}</b></div>
              </div>

              {selectedNeedsPreparation ? <section className="freshJobsDetailBox notes"><span>Not ready to approve</span><p>This review item is explanation only. It needs a concrete prepared draft/action before it can be approved.</p></section> : null}
              <section className="freshJobsDetailBox notes"><span>Summary</span><p>{summaryOf(selected)}</p></section>
              {detailRows(selected).map((row) => <section className="freshJobsDetailBox notes" key={row.label}><span>{row.label}</span><p>{row.value}</p></section>)}

              <label className="freshField"><span>Owner note / edit</span><textarea value={ownerNote} onChange={(event) => setOwnerNote(event.target.value)} placeholder="Add approval note, edit instruction, or reason for ignoring" /></label>
            </>
          ) : <div className="freshItem"><b>No Review item selected</b><span>When Churvox prepares work, it will appear here for approval.</span></div>}
        </section>

        <aside className="freshCard freshJobsActionsCard">
          <h2>Owner controls</h2>
          <p className="freshJobsActionHint">Backend items can execute only after owner approval. Browser slips must be promoted first.</p>
          <div className="freshActions freshJobsActionStack">
            <button className="freshPrimary" type="button" disabled={!selected || selected.sourceMode !== "backend" || !selectedHasConcreteAction || busy === "approve"} onClick={approveSelected}>{busy === "approve" ? "Approving..." : selectedNeedsPreparation ? "Needs prepared action" : "Approve backend action"}</button>
            <button className="freshDark" type="button" disabled={!selected || selected.sourceMode !== "backend" || busy === "save"} onClick={saveSelected}>{busy === "save" ? "Saving..." : "Save edit"}</button>
            <button className="freshGhost" type="button" disabled={!selected || selected.sourceMode !== "backend" || busy === "ignore"} onClick={ignoreSelected}>Ignore</button>
            <button className="freshOrange" type="button" disabled={!localItems.length || busy === "promote"} onClick={promoteLocalItems}>{busy === "promote" ? "Promoting..." : "Promote local slips"}</button>
            <button className="freshDark" type="button" disabled={busy === "scan"} onClick={scanBackendRisks}>{busy === "scan" ? "Preparing..." : "Run backend scan"}</button>
            <button className="freshGhost" type="button" disabled={!selected} onClick={openSelectedArea}>Open area</button>
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
