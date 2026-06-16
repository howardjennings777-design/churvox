import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

function titleOf(item) { return item?.title || item?.summary || "Prepared admin action"; }
function summaryOf(item) { return item?.summary || "Prepared by Churvox AI and waiting for owner approval."; }
function categoryOf(item) { return String(item?.category || item?.action || "other").toLowerCase(); }
function entriesOf(item) {
  const details = item?.details && typeof item.details === "object" ? item.details : {};
  const entries = Object.entries(details).filter(([, value]) => value !== undefined && value !== null && String(value).trim());
  if (entries.length) return entries;
  return [["What Churvox found", item?.match?.label || "AI checked live Churvox records."], ["What Churvox prepared", summaryOf(item)], ["Why it needs approval", "Owner approval is required before Churvox changes real records."]];
}
function itemId(item) { return item?.id || item?._id || ""; }

function DetailGrid({ item }) {
  return <div className="freshReviewDetailGrid">{entriesOf(item).slice(0, 8).map(([key, value]) => <section key={key}><b>{key}</b><p>{String(value)}</p></section>)}</div>;
}

function ReviewModal({ item, busy, onClose, onSave, onApprove, onIgnore }) {
  const [note, setNote] = React.useState(item?.owner_note || "");
  React.useEffect(() => { setNote(item?.owner_note || ""); }, [itemId(item)]);
  if (!item) return null;
  return <div className="freshReviewShade" role="dialog" aria-modal="true"><section className="freshReviewModal"><button className="freshReviewClose" type="button" onClick={onClose}>×</button><header><span>Backend Owner Review</span><h2>{titleOf(item)}</h2><p>{summaryOf(item)}</p></header><DetailGrid item={item} /><section className="freshReviewSafe"><b>Safe rule</b><p>{categoryOf(item) === "money" ? "Money actions stay draft-only. Nothing sends, syncs or marks paid from Review." : "Churvox changes live records only after this backend approval."}</p></section><label className="freshReviewNote"><span>Owner note / edit</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note before saving or approval." /></label><div className="freshActions"><button className="freshPrimary" type="button" disabled={busy} onClick={() => onApprove(item, note)}>{busy ? "Approving…" : "Approve backend action"}</button><button className="freshGhost" type="button" disabled={busy} onClick={() => onSave(item, note)}>Save note</button><button className="freshGhost" type="button" disabled={busy} onClick={() => onIgnore(item, note)}>Ignore</button></div></section></div>;
}

function ReviewCard({ item, busy, onOpen, onApprove, onIgnore }) {
  return <article className={`freshReviewItem ${categoryOf(item)}`}><div><span>{categoryOf(item)}</span><em>{item?.created_at ? new Date(item.created_at).toLocaleString("en-NZ") : "backend"}</em></div><h3>{titleOf(item)}</h3><p>{summaryOf(item)}</p><DetailGrid item={item} /><div className="freshActions"><button className="freshPrimary" type="button" onClick={() => onOpen(item)}>Open review</button><button className="freshGhost" type="button" disabled={busy} onClick={() => onApprove(item, "Approved from Review.")}>Approve</button><button className="freshGhost" type="button" disabled={busy} onClick={() => onIgnore(item, "Ignored from Review.")}>Ignore</button></div></article>;
}

function Style() { return <style>{`.freshReviewPage{display:grid;gap:16px}.freshReviewHero{border-radius:34px;background:#101827;color:white;padding:28px;border-left:8px solid #f97316;box-shadow:0 24px 70px rgba(2,6,23,.20)}.freshReviewHero span{display:inline-flex;border-radius:999px;background:#fff7ed;color:#9a3412;padding:9px 13px;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em}.freshReviewHero h1{margin:13px 0 8px;color:white;font-size:clamp(38px,5vw,66px);line-height:.92;letter-spacing:-.06em}.freshReviewHero p{margin:0;color:#e5e7eb;font-weight:850;line-height:1.45}.freshReviewStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}.freshReviewStats div{border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);padding:13px}.freshReviewStats small{display:block;color:#fed7aa;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em}.freshReviewStats b{display:block;color:#fff;font-size:25px;margin-top:4px}.freshReviewToolbar{display:flex;flex-wrap:wrap;gap:8px}.freshReviewToolbar button{border:1px solid rgba(15,23,42,.12);border-radius:999px;background:#fffaf0;color:#101827;padding:10px 14px;font-weight:1000;cursor:pointer}.freshReviewToolbar button.active{background:#111827;color:white}.freshReviewList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.freshReviewItem{border:1px solid rgba(15,23,42,.12);border-left:7px solid #f97316;border-radius:28px;background:#fffaf0;padding:17px;box-shadow:0 16px 42px rgba(2,6,23,.08);display:grid;gap:11px}.freshReviewItem.money{border-left-color:#16a34a}.freshReviewItem.work{border-left-color:#2563eb}.freshReviewItem>div:first-child{display:flex;justify-content:space-between;gap:10px}.freshReviewItem span{border-radius:999px;background:#fff7ed;color:#9a3412;padding:7px 10px;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:1000}.freshReviewItem em{font-style:normal;color:#64748b;font-size:11px;font-weight:900}.freshReviewItem h3{margin:0;color:#101827;font-size:24px;line-height:1;letter-spacing:-.04em}.freshReviewItem p{margin:0;color:#475569;font-weight:850;line-height:1.4}.freshReviewDetailGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.freshReviewDetailGrid section{border:1px solid rgba(15,23,42,.10);border-radius:16px;background:#fff;padding:10px}.freshReviewDetailGrid b{display:block;color:#101827;font-size:12px;font-weight:1000}.freshReviewDetailGrid p{margin:4px 0 0;color:#475569;font-size:12px;font-weight:850;word-break:break-word}.freshReviewEmpty,.freshReviewError{border:1px dashed rgba(15,23,42,.18);border-radius:28px;background:#fffaf0;padding:26px;display:grid;gap:12px}.freshReviewEmpty h2,.freshReviewError h2{margin:0;color:#101827;font-size:30px;letter-spacing:-.04em}.freshReviewEmpty p,.freshReviewError p{margin:0;color:#475569;font-weight:850;max-width:780px}.freshReviewShade{position:fixed;inset:0;background:rgba(2,6,23,.60);z-index:9999;display:grid;place-items:center;padding:18px}.freshReviewModal{max-width:980px;width:min(980px,100%);max-height:90vh;overflow:auto;border-radius:30px;background:#fffaf0;padding:22px;box-shadow:0 30px 90px rgba(2,6,23,.35);display:grid;gap:14px;position:relative}.freshReviewClose{position:absolute;right:14px;top:14px;border:0;border-radius:999px;width:40px;height:40px;background:#111827;color:#fff;font-size:22px;cursor:pointer}.freshReviewModal header span{display:inline-flex;border-radius:999px;background:#fff7ed;color:#9a3412;padding:8px 11px;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em}.freshReviewModal h2{margin:9px 0 4px;color:#101827;font-size:34px;letter-spacing:-.05em}.freshReviewModal p{margin:0;color:#475569;font-weight:850}.freshReviewSafe{border:1px solid rgba(249,115,22,.22);border-radius:20px;background:#fff7ed;padding:13px}.freshReviewSafe b{color:#9a3412}.freshReviewSafe p{margin-top:5px}.freshReviewNote{display:grid;gap:7px}.freshReviewNote span{font-weight:1000;color:#101827}.freshReviewNote textarea{min-height:110px;border:1px solid rgba(15,23,42,.14);border-radius:18px;padding:12px;font-weight:850;color:#101827;background:white}@media(max-width:800px){.freshReviewStats,.freshReviewList,.freshReviewDetailGrid{grid-template-columns:1fr}.freshReviewHero{padding:22px}.freshReviewHero h1{font-size:42px}}`}</style>; }

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
    setItems(Array.isArray(list) ? list : []);
  }, [get]);

  React.useEffect(() => { loadItems(); }, [loadItems]);
  React.useEffect(() => { const reload = () => loadItems(); window.addEventListener("churvox:fresh-data-updated", reload); return () => window.removeEventListener("churvox:fresh-data-updated", reload); }, [loadItems]);

  async function approveItem(item, note = "") {
    const id = itemId(item); if (!id) return;
    setBusyId(id);
    const res = await post(`/ai-review-items/${id}/approve`, { note }, { timeout: 60000 });
    setBusyId("");
    if (!res?.success) { toast.error(res?.error || "Backend approval failed."); return; }
    toast.success("Approved. Backend executed the prepared work.");
    setActive(null); loadItems();
  }
  async function saveEdit(item, note = "") {
    const id = itemId(item); if (!id) return;
    setBusyId(id);
    const res = await patch(`/ai-review-items/${id}`, { note }, { timeout: 25000 });
    setBusyId("");
    if (!res?.success) { toast.error(res?.error || "Could not save note."); return; }
    toast.success("Saved in backend Review.");
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

  return <section className="freshReviewPage"><Style />
    <header className="freshReviewHero"><span>Owner Review</span><h1>Approve what Churvox AI prepared.</h1><p>Backend-owned Review only. Items come from real AI and live in the business database. Nothing changes until you approve.</p><div className="freshReviewStats"><div><small>Waiting</small><b>{loading ? "…" : waiting}</b></div><div><small>Money</small><b>{money}</b></div><div><small>Work</small><b>{work}</b></div><div><small>Create</small><b>{create}</b></div></div></header>
    <div className="freshReviewToolbar">{["all", "money", "work", "create", "other"].map((key) => <button key={key} type="button" className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{key}</button>)}<button type="button" onClick={loadItems}>Reload backend Review</button></div>
    {error ? <section className="freshReviewError"><h2>Backend Review is not available.</h2><p>{error}</p><div className="freshActions"><button className="freshPrimary" type="button" onClick={() => onNavigate?.("quickcreateai")}>Back to Tell Churvox</button><button className="freshGhost" type="button" onClick={loadItems}>Retry backend</button></div></section> : loading ? <section className="freshReviewEmpty"><h2>Loading backend Review…</h2><p>Checking the business database for AI-prepared work.</p></section> : waiting === 0 ? <section className="freshReviewEmpty"><h2>Nothing waiting for approval.</h2><p>Tell Churvox what happened and real AI-prepared backend work will appear here.</p><div className="freshActions"><button className="freshPrimary" type="button" onClick={() => onNavigate?.("quickcreateai")}>Tell Churvox</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("smart")}>Back to Today</button></div></section> : <section className="freshReviewList">{visible.map((item) => <ReviewCard key={itemId(item)} item={item} busy={busyId === itemId(item)} onOpen={setActive} onApprove={approveItem} onIgnore={ignoreItem} />)}</section>}
    <ReviewModal item={active} busy={busyId === itemId(active)} onClose={() => setActive(null)} onApprove={approveItem} onSave={saveEdit} onIgnore={ignoreItem} />
  </section>;
}
