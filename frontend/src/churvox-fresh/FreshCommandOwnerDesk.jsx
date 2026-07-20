import React from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "./freshReviewActionForms.css";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

function text(value) {
  return String(value || "").trim();
}

function lower(value) {
  return text(value).toLowerCase();
}

function itemId(item) {
  return item?.reviewId || item?.id || item?._id || "";
}

function payloadOf(item) {
  return item?.payload && typeof item.payload === "object" ? item.payload : {};
}

function backendAction(item) {
  return lower(item?.action || item?.action_type || item?.actionType || item?.payload?.action || "");
}

function categoryFrom(value, action = "") {
  const raw = lower(`${value || ""} ${action || ""}` || "other");
  if (/payment|invoice|quote|xero|money|paid|overdue|follow/.test(raw)) return "money";
  if (/payroll|time|worker|team|staff/.test(raw)) return "team";
  if (/import|setup|settings|migration|csv/.test(raw)) return "setup";
  if (/job|schedule|complete|reschedule|work|price/.test(raw)) return "work";
  if (/create|client/.test(raw)) return "create";
  return raw || "other";
}

function categoryOf(item) {
  return item?.category || categoryFrom(item?.group || item?.area || item?.source_type, backendAction(item));
}

function createdTime(item) {
  const raw = item?.created_at || item?.createdAt || item?.created || "";
  const date = raw ? new Date(raw) : null;
  if (date && !Number.isNaN(date.getTime())) return date.toLocaleString("en-NZ");
  return text(raw) || item?.sourceLabel || "now";
}

function titleOf(item) {
  return text(item?.title || item?.summary || item?.original_text || item?.action || item?.action_type || "Prepared owner action");
}

function summaryOf(item) {
  const p = payloadOf(item);
  const details = [
    item?.info,
    item?.detail,
    item?.found,
    item?.prepared,
    p.message || p.update,
    p.customer_name || p.client_name || p.name,
    p.invoice_number,
    p.address,
    p.total || p.amount || p.price ? `$${p.total || p.amount || p.price}` : "",
  ].filter(Boolean);
  return details[0] || "Churvox prepared this for owner review.";
}

function compactDetails(item) {
  const p = payloadOf(item);
  const rows = [];
  const values = {
    Area: item?.area || item?.group || item?.category || item?.source_type,
    Action: item?.action || item?.action_type,
    Worker: item?.worker_name || p.worker_name,
    Job: item?.job_title || p.job_title,
    Customer: p.customer_name || p.client_name || p.name,
    Invoice: p.invoice_number,
    Amount: p.amount_owing || p.total || p.amount || p.price,
    Status: item?.urgency || item?.status,
  };
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && text(value) !== "") rows.push([key, String(value)]);
  });
  return rows.slice(0, 6);
}

function readLocalSlips() {
  try {
    const raw = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalSlips(slips) {
  try {
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify(slips.slice(0, 50)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "command-local" } }));
  } catch {}
}

function normaliseBackendItem(item) {
  return {
    ...item,
    reviewId: item?.id || item?._id,
    source: "backend",
    sourceLabel: "Backend review",
    category: categoryFrom(item?.category, item?.action),
  };
}

function normaliseCommandSlip(item) {
  const fieldSlip = lower(item?.source_type) === "worker" && !!item?.payload?.worker_field_slip;
  return {
    ...item,
    reviewId: item?.id || item?._id,
    source: "command",
    sourceLabel: fieldSlip ? "Worker field update" : "Command slip",
    commandKind: fieldSlip ? "field" : "slip",
    action: item?.action || item?.action_type || "owner_review",
    category: categoryFrom(item?.category || item?.source_type, item?.action_type || item?.action),
  };
}

function normaliseLocalSlip(item) {
  return {
    ...item,
    reviewId: item?.id || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    source: "local",
    sourceLabel: "Local workflow",
    action: item?.action || lower(item?.group || item?.area || "workflow_review").replace(/[^a-z0-9]+/g, "_") || "workflow_review",
    category: categoryFrom(item?.group || item?.area || item?.title, item?.action),
    payload: item?.payload || {
      found: item?.found,
      prepared: item?.prepared,
      why: item?.why,
      owner: item?.owner,
      info: item?.info,
    },
  };
}

function sourceKey(item) {
  const p = payloadOf(item);
  const sourceId = text(item?.source_id || item?.sourceId || item?.request_id || p.request_id || p.source_id);
  const sourceType = text(item?.source_type || item?.sourceType || item?.area || item?.group);
  const action = text(item?.action_type || item?.actionType || item?.action);
  if (sourceId) return `${sourceType}:${action}:${sourceId}`.toLowerCase();
  return `${item?.source || "item"}:${itemId(item) || titleOf(item)}`.toLowerCase();
}

function dedupeItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = sourceKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    const ad = new Date(a?.created_at || a?.createdAt || 0).getTime() || 0;
    const bd = new Date(b?.created_at || b?.createdAt || 0).getTime() || 0;
    return bd - ad;
  });
}

function responseItems(res, names) {
  const candidates = [];
  names.forEach((name) => {
    candidates.push(res?.data?.[name], res?.[name]);
  });
  candidates.push(Array.isArray(res?.data) ? res.data : null);
  return candidates.find(Array.isArray) || [];
}

function ReviewCard({ item, busy, onOpen, onApprove, onIgnore }) {
  return (
    <article className={`freshReviewItem ${categoryOf(item)}`}>
      <div>
        <span>{categoryOf(item)}</span>
        <em>{item.sourceLabel || item.source || "review"} · {createdTime(item)}</em>
      </div>
      <h3>{titleOf(item)}</h3>
      <p>{summaryOf(item)}</p>
      <div className="freshReviewMiniGrid">
        {compactDetails(item).map(([key, value]) => <section key={key}><b>{key}</b><p>{value}</p></section>)}
      </div>
      <div className="freshActions">
        <button className="freshPrimary" type="button" onClick={() => onOpen(item)}>Open slip</button>
        <button className="freshGhost" type="button" disabled={busy} onClick={() => onApprove(item)}>{item.source === "backend" ? "Approve" : "Mark reviewed"}</button>
        <button className="freshGhost" type="button" disabled={busy} onClick={() => onIgnore(item)}>Ignore</button>
      </div>
    </article>
  );
}

function ReviewModal({ item, busy, onClose, onApprove, onIgnore, onNavigate }) {
  if (!item || typeof document === "undefined") return null;
  const p = payloadOf(item);
  return createPortal(
    <div className="freshPopupBackdrop freshReviewPopupBackdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="dialog" aria-modal="true">
      <section className="freshCard freshReviewPopupCard">
        <button className="freshReviewClose" type="button" onClick={onClose}>×</button>
        <header className="freshHero freshReviewPopupHero">
          <span>{item.sourceLabel || "Owner review"}</span>
          <h1>{titleOf(item)}</h1>
          <p>{summaryOf(item)}</p>
        </header>
        <div className="freshReviewPopupBody">
          <section className="freshReviewForm">
            <div className="freshReviewFormHead">
              <span>{item?.group || item?.area || item?.source_type || item?.action || "Prepared action"}</span>
              <p>Churvox prepared this. Review it before anything changes.</p>
            </div>
            <div className="freshReviewFormGrid">
              <label className="wide"><span>Churvox found</span><textarea readOnly value={item?.found || p?.found || summaryOf(item)} /></label>
              <label className="wide"><span>Churvox prepared</span><textarea readOnly value={item?.prepared || p?.prepared || "Owner review slip prepared."} /></label>
              <label className="wide"><span>Why it matters</span><textarea readOnly value={item?.why || p?.why || item?.detail || "This may need owner approval."} /></label>
              <label className="wide"><span>Owner control</span><textarea readOnly value={item?.owner || p?.owner || "Approve, ignore, open the area, or adjust the source record."} /></label>
              {Object.keys(p || {}).length ? <label className="wide"><span>Payload / details</span><textarea readOnly value={JSON.stringify(p, null, 2)} /></label> : null}
            </div>
          </section>
          <section className="freshReviewSafe"><b>Safe rule</b><p>Nothing creates, sends, syncs, marks paid, or changes live records unless the owner approves the source action.</p></section>
          <div className="freshActions freshReviewModalActions">
            <button className="freshPrimary" type="button" disabled={busy} onClick={() => onApprove(item)}>{busy ? "Working…" : item.source === "backend" ? "Approve backend action" : "Mark reviewed"}</button>
            <button className="freshGhost" type="button" disabled={busy} onClick={() => onIgnore(item)}>Ignore</button>
            {item?.page ? <button className="freshGhost" type="button" onClick={() => { onClose(); onNavigate?.(item.page); }}>Open {item.area || item.group || item.page}</button> : null}
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}

function Style() {
  return <style>{`
    .freshReviewPage{display:grid;gap:16px}
    .freshReviewHero{border-radius:34px;background:radial-gradient(circle at top right,rgba(249,115,22,.24),transparent 34%),linear-gradient(135deg,#0b1220,#111827 48%,#1f2937);color:white;padding:28px;border-left:8px solid #f97316;box-shadow:0 24px 70px rgba(2,6,23,.20)}
    .freshReviewHero span{display:inline-flex;border-radius:999px;background:#fff7ed;color:#9a3412;padding:9px 13px;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em}.freshReviewHero h1{margin:13px 0 8px;color:white;font-size:clamp(38px,5vw,66px);line-height:.92;letter-spacing:-.06em}.freshReviewHero p{margin:0;color:#e5e7eb;font-weight:850;line-height:1.45}
    .freshReviewStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}.freshReviewStats div{border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);padding:13px}.freshReviewStats small{display:block;color:#fed7aa;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em}.freshReviewStats b{display:block;color:#fff;font-size:25px;margin-top:4px}
    .freshReviewToolbar{display:flex;flex-wrap:wrap;gap:8px}.freshReviewToolbar button{border:1px solid rgba(15,23,42,.12);border-radius:999px;background:#fffaf0;color:#101827;padding:10px 14px;font-weight:1000;cursor:pointer}.freshReviewToolbar button.active{background:#111827;color:white}
    .freshReviewList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.freshReviewItem{border:1px solid rgba(15,23,42,.12);border-left:7px solid #f97316;border-radius:28px;background:#fffaf0;padding:17px;box-shadow:0 16px 42px rgba(2,6,23,.08);display:grid;gap:11px}.freshReviewItem.money{border-left-color:#16a34a}.freshReviewItem.work{border-left-color:#2563eb}.freshReviewItem.team{border-left-color:#7c3aed}.freshReviewItem.setup{border-left-color:#f97316}
    .freshReviewItem>div:first-child{display:flex;justify-content:space-between;gap:10px}.freshReviewItem span{border-radius:999px;background:#fff7ed;color:#9a3412;padding:7px 10px;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:1000}.freshReviewItem em{font-style:normal;color:#64748b;font-size:11px;font-weight:900}.freshReviewItem h3{margin:0;color:#101827;font-size:24px;line-height:1;letter-spacing:-.04em}.freshReviewItem p{margin:0;color:#475569;font-weight:850;line-height:1.4}
    .freshReviewMiniGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.freshReviewMiniGrid section{border:1px solid rgba(15,23,42,.10);border-radius:16px;background:#fff;padding:10px}.freshReviewMiniGrid b{display:block;color:#101827;font-size:12px;font-weight:1000}.freshReviewMiniGrid p{margin:4px 0 0;color:#475569;font-size:12px;font-weight:850;word-break:break-word}
    .freshReviewEmpty,.freshReviewError{border:1px dashed rgba(15,23,42,.18);border-radius:28px;background:#fffaf0;padding:26px;display:grid;gap:12px}.freshReviewEmpty h2,.freshReviewError h2{margin:0;color:#101827;font-size:30px;letter-spacing:-.04em}.freshReviewEmpty p,.freshReviewError p{margin:0;color:#475569;font-weight:850;max-width:780px}.freshReviewSafe{border:1px solid rgba(249,115,22,.22);border-radius:20px;background:#fff7ed;padding:13px}.freshReviewSafe b{color:#9a3412}.freshReviewSafe p{margin:5px 0 0;color:#475569;font-weight:850}.freshReviewClose{position:absolute;right:14px;top:14px;z-index:8;border:0;border-radius:999px;width:42px;height:42px;background:#111827;color:white;font-size:24px;font-weight:1000;cursor:pointer}
    @media(max-width:800px){.freshReviewStats,.freshReviewList,.freshReviewMiniGrid{grid-template-columns:1fr}.freshReviewHero{padding:22px}.freshReviewHero h1{font-size:42px}}
  `}</style>;
}

export default function FreshCommandOwnerDesk({ onNavigate }) {
  const { get, post } = useApi();
  const [items, setItems] = React.useState([]);
  const [filter, setFilter] = React.useState("all");
  const [active, setActive] = React.useState(null);
  const [busyId, setBusyId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const local = readLocalSlips().map(normaliseLocalSlip);
    const [reviewRes, commandRes] = await Promise.all([
      get("/ai-review-items", { timeout: 25000 }),
      get("/command/slips", { timeout: 25000 }),
    ]);

    const backend = reviewRes?.success ? responseItems(reviewRes, ["items"]).map(normaliseBackendItem) : [];
    const command = commandRes?.success ? responseItems(commandRes, ["slips", "items"]).map(normaliseCommandSlip) : [];
    if (!reviewRes?.success || !commandRes?.success) {
      const missing = [!reviewRes?.success ? "AI review" : "", !commandRes?.success ? "Command slips" : ""].filter(Boolean).join(" and ");
      setError(`${missing} could not reload. Showing every available owner-review item.`);
    }

    const merged = sortItems(dedupeItems([...command, ...backend, ...local]));
    setItems(merged);
    setLoading(false);
    try {
      const focusId = window.localStorage.getItem("churvox:last-ai-review-id:v1");
      if (focusId) {
        const found = merged.find((item) => itemId(item) === focusId);
        if (found) { setFilter("all"); setActive(found); window.localStorage.removeItem("churvox:last-ai-review-id:v1"); }
      }
    } catch {}
  }, [get]);

  React.useEffect(() => { loadItems(); }, [loadItems]);
  React.useEffect(() => {
    const reload = () => loadItems();
    window.addEventListener("churvox:fresh-data-updated", reload);
    window.addEventListener("storage", reload);
    return () => { window.removeEventListener("churvox:fresh-data-updated", reload); window.removeEventListener("storage", reload); };
  }, [loadItems]);

  function removeLocal(item) {
    const id = itemId(item);
    writeLocalSlips(readLocalSlips().filter((slip) => (slip.id || slip.reviewId) !== id));
    setActive(null);
    loadItems();
  }

  async function commandDecision(item, decision) {
    const id = itemId(item);
    const path = item.commandKind === "field"
      ? `/command/field-slips/${id}/${decision === "ignore" ? "ignore" : "approve"}`
      : `/command/slips/${id}/${decision === "ignore" ? "ignore" : "approve"}`;
    return post(path, { note: decision === "ignore" ? "Ignored from combined Command desk." : "Reviewed from combined Command desk." }, { timeout: 25000 });
  }

  async function approveItem(item) {
    const id = itemId(item);
    if (!id) return;
    setBusyId(id);
    if (item.source === "local") {
      removeLocal(item);
      setBusyId("");
      toast.success("Reviewed. Workflow slip cleared from Command.");
      return;
    }
    const res = item.source === "command"
      ? await commandDecision(item, "approve")
      : await post(`/ai-review-items/${id}/approve`, { note: "Approved from combined Command desk." }, { timeout: 60000 });
    setBusyId("");
    if (!res?.success) { toast.error(res?.error || "Owner review could not be recorded."); return; }
    toast.success(item.source === "command" ? "Reviewed. Nothing was sent or changed." : "Approved. Backend executed the prepared work.");
    setActive(null);
    loadItems();
  }

  async function ignoreItem(item) {
    const id = itemId(item);
    if (!id) return;
    setBusyId(id);
    if (item.source === "local") {
      removeLocal(item);
      setBusyId("");
      toast.info("Ignored. Workflow slip cleared.");
      return;
    }
    const res = item.source === "command"
      ? await commandDecision(item, "ignore")
      : await post(`/ai-review-items/${id}/ignore`, { note: "Ignored from combined Command desk." }, { timeout: 25000 });
    setBusyId("");
    if (!res?.success) { toast.error(res?.error || "Could not ignore item."); return; }
    toast.info("Ignored. Owner review queue updated.");
    setActive(null);
    loadItems();
  }

  const waiting = items.length;
  const money = items.filter((item) => categoryOf(item) === "money").length;
  const team = items.filter((item) => categoryOf(item) === "team").length;
  const setup = items.filter((item) => categoryOf(item) === "setup").length;
  const visible = filter === "all" ? items : items.filter((item) => categoryOf(item) === filter || (filter === "backend" && item.source === "backend") || (filter === "command" && item.source === "command") || (filter === "workflow" && item.source === "local"));

  return (
    <section className="freshReviewPage">
      <Style />
      <header className="freshReviewHero">
        <span>Owner Review</span>
        <h1>Approve what Churvox prepared.</h1>
        <p>AI actions, worker updates and workflow slips land here. Nothing important changes until the owner approves or reviews it.</p>
        <div className="freshReviewStats">
          <div><small>Waiting</small><b>{loading ? "…" : waiting}</b></div>
          <div><small>Money</small><b>{money}</b></div>
          <div><small>Team</small><b>{team}</b></div>
          <div><small>Setup</small><b>{setup}</b></div>
        </div>
      </header>
      <div className="freshReviewToolbar">
        {["all", "money", "work", "team", "setup", "create", "command", "backend", "workflow", "other"].map((key) => <button key={key} type="button" className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{key}</button>)}
        <button type="button" onClick={loadItems}>Reload Command</button>
      </div>
      {error ? <section className="freshReviewError"><h2>Command reload warning</h2><p>{error}</p><div className="freshActions"><button className="freshPrimary" type="button" onClick={() => onNavigate?.("quickcreateai")}>Tell Churvox</button><button className="freshGhost" type="button" onClick={loadItems}>Retry</button></div></section> : null}
      {loading ? <section className="freshReviewEmpty"><h2>Loading Command…</h2><p>Checking AI review, durable Command slips and local workflow items.</p></section> : waiting === 0 ? <section className="freshReviewEmpty"><h2>Nothing waiting for approval.</h2><p>Payments, payroll, worker updates, imports, Xero checks and AI-prepared work will appear here when owner review is needed.</p><div className="freshActions"><button className="freshPrimary" type="button" onClick={() => onNavigate?.("quickcreateai")}>Tell Churvox</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("smart")}>Back to Today</button></div></section> : <section className="freshReviewList">{visible.map((item) => <ReviewCard key={`${item.source}-${itemId(item)}`} item={item} busy={busyId === itemId(item)} onOpen={setActive} onApprove={approveItem} onIgnore={ignoreItem} />)}</section>}
      <ReviewModal item={active} busy={busyId === itemId(active)} onClose={() => setActive(null)} onApprove={approveItem} onIgnore={ignoreItem} onNavigate={onNavigate} />
    </section>
  );
}
