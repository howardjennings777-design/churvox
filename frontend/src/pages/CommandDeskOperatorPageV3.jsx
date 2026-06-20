import React from "react";
import { toast } from "sonner";

const REVIEW_KEY = "churvox:review-inbox:v1";
const OLD_REVIEW_KEY = "churvox:fresh-command-inbox:v1";
const ARCHIVE_KEY = "churvox:review-archive:v1";

const EMPTY_ITEMS = [
  {
    id: "empty-money",
    title: "Draft invoices and follow-ups will appear here",
    category: "money",
    type: "invoice",
    summary: "Tell Churvox can prepare invoice drafts and follow-up drafts, then hold them here for owner approval.",
    source: "Review guide",
    status: "guide",
    createdAt: "Ready",
    details: {
      "What Churvox found": "No saved money approvals yet.",
      "What Churvox prepared": "Invoice and follow-up drafts will stay draft-only until you approve.",
      "Why it needs approval": "Money actions should not send or sync silently."
    }
  },
  {
    id: "empty-work",
    title: "Job changes will appear here",
    category: "work",
    type: "job",
    summary: "Move job, complete job, update price and find-record actions can be checked here before you act.",
    source: "Review guide",
    status: "guide",
    createdAt: "Ready",
    details: {
      "What Churvox found": "No saved job-change approvals yet.",
      "What Churvox prepared": "Live changes will show the matched record and the exact change.",
      "Why it needs approval": "Owner control stops accidental live record changes."
    }
  },
  {
    id: "empty-create",
    title: "Created records will appear here",
    category: "create",
    type: "record",
    summary: "New clients, jobs, quotes, invoices and workers can be saved to Review if details need checking.",
    source: "Review guide",
    status: "guide",
    createdAt: "Ready",
    details: {
      "What Churvox found": "No saved create approvals yet.",
      "What Churvox prepared": "Missing fields and draft details will be shown clearly.",
      "Why it needs approval": "You can fix details before they become real records."
    }
  }
];

function safeParse(value, fallback = []) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normaliseCategory(item) {
  const raw = String(item?.category || item?.type || "").toLowerCase();
  if (raw.includes("invoice") || raw.includes("money") || raw.includes("chase")) return "money";
  if (raw.includes("job") || raw.includes("complete") || raw.includes("reschedule") || raw.includes("update") || raw.includes("find")) return "work";
  if (raw.includes("client") || raw.includes("quote") || raw.includes("person") || raw.includes("worker") || raw.includes("create")) return "create";
  return "other";
}

function itemTitle(item) {
  return item?.title || item?.summary || "Review item";
}

function itemSummary(item) {
  if (item?.summary && item.summary !== item.title) return item.summary;
  const details = item?.details || {};
  return details.Change || details.Action || details.Status || "Prepared by Churvox and waiting for owner review.";
}

function detailEntries(item) {
  const details = item?.details || {};
  const entries = Object.entries(details).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
  if (entries.length) return entries;
  return [
    ["What Churvox found", item?.livePreview?.previewTitle || "Saved owner-review item"],
    ["What Churvox prepared", itemSummary(item)],
    ["Why it needs approval", "Nothing changes, sends, or syncs until the owner approves."],
  ];
}

function loadItems() {
  if (typeof window === "undefined") return [];
  const main = safeParse(window.localStorage.getItem(REVIEW_KEY));
  const old = safeParse(window.localStorage.getItem(OLD_REVIEW_KEY));
  const byId = new Map();
  [...main, ...old].forEach((item) => {
    if (!item || typeof item !== "object") return;
    const id = item.id || `${item.title || "review"}-${item.createdAt || ""}`;
    if (!byId.has(id)) byId.set(id, { ...item, id, category: normaliseCategory(item) });
  });
  return Array.from(byId.values());
}

function saveItems(items) {
  try {
    window.localStorage.setItem(REVIEW_KEY, JSON.stringify(items));
    window.localStorage.setItem(OLD_REVIEW_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "review-tray" } }));
  } catch {}
}

function archiveItem(item, outcome) {
  try {
    const current = safeParse(window.localStorage.getItem(ARCHIVE_KEY));
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify([{ ...item, outcome, archivedAt: new Date().toISOString() }, ...current].slice(0, 100)));
  } catch {}
}

function Stat({ label, value, hint }) {
  return <div className="rvStat"><small>{label}</small><b>{value}</b><span>{hint}</span></div>;
}

function DetailGrid({ item }) {
  return <div className="rvDetailGrid">{detailEntries(item).slice(0, 8).map(([key, value]) => <section key={key}><b>{key}</b><p>{String(value)}</p></section>)}</div>;
}

function ReviewModal({ item, onClose, onSave, onApprove, onIgnore }) {
  const [note, setNote] = React.useState(item?.ownerNote || "");
  const [status, setStatus] = React.useState(item?.status || "open");
  React.useEffect(() => { setNote(item?.ownerNote || ""); setStatus(item?.status || "open"); }, [item?.id]);
  if (!item) return null;
  return (
    <div className="rvShade" role="dialog" aria-modal="true">
      <section className="rvModal">
        <button className="rvClose" type="button" onClick={onClose}>×</button>
        <header>
          <span>Owner Review</span>
          <h2>{itemTitle(item)}</h2>
          <p>{itemSummary(item)}</p>
        </header>
        <div className="rvModalGrid">
          <div>
            <DetailGrid item={item} />
            <section className="rvSafeBox">
              <b>Safe rule</b>
              <p>{item.category === "money" ? "Money actions stay draft-only here. Nothing sends, syncs, marks paid, or contacts a customer from Review." : item.category === "work" ? "Job changes only happen after you approve a live matched action. Review can hold or ignore the item safely." : "Create actions can be checked before they become real records."}</p>
            </section>
          </div>
          <div className="rvEditor">
            <label><span>Review status</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="open">Needs approval</option><option value="edited">Edited</option><option value="approved">Approved</option><option value="ignored">Ignored</option></select></label>
            <label><span>Owner note / edit</span><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add what you changed or why you approved it." /></label>
          </div>
        </div>
        <div className="rvActions">
          <button type="button" onClick={() => onApprove(item, { note, status: "approved" })}>Approve</button>
          <button type="button" onClick={() => onSave(item, { note, status })}>Save edit</button>
          <button type="button" onClick={() => onIgnore(item, { note, status: "ignored" })}>Ignore</button>
        </div>
      </section>
    </div>
  );
}

function ReviewCard({ item, onOpen, onApprove, onIgnore }) {
  const isGuide = item.status === "guide";
  return (
    <article className={`rvCard ${item.category || "other"} ${isGuide ? "guide" : ""}`}>
      <div className="rvCardTop"><span>{item.category || "review"}</span><em>{item.createdAt || "now"}</em></div>
      <h3>{itemTitle(item)}</h3>
      <p>{itemSummary(item)}</p>
      <DetailGrid item={item} />
      <div className="rvCardActions">
        <button type="button" onClick={() => onOpen(item)}>{isGuide ? "Open guide" : "Open review"}</button>
        {!isGuide ? <button type="button" onClick={() => onApprove(item, { note: "Approved from Review tray.", status: "approved" })}>Approve</button> : null}
        {!isGuide ? <button type="button" onClick={() => onIgnore(item, { note: "Ignored from Review tray.", status: "ignored" })}>Ignore</button> : null}
      </div>
    </article>
  );
}

function Style() {
  return <style>{`
    .rvRoot,.rvRoot *{box-sizing:border-box;color-scheme:light;text-shadow:none}
    .rvRoot{min-height:100vh;background:#f6f1e7;color:#111827;font-family:Inter,system-ui;padding:24px 26px 120px}
    .rvWrap{max-width:1400px;margin:0 auto;display:grid;gap:18px}
    .rvHero{border-radius:34px;background:#101827;color:#fff;padding:28px 30px;box-shadow:0 24px 70px rgba(2,6,23,.22);border-left:8px solid #f97316}
    .rvTop{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:16px}.rvTop a,.rvTop button{border:0;border-radius:999px;background:#fff7ed;color:#9a3412;padding:11px 15px;font-weight:1000;text-decoration:none;cursor:pointer}.rvHero span,.rvModal header span{display:inline-flex;border-radius:999px;background:rgba(249,115,22,.16);color:#fed7aa;padding:8px 11px;font-size:10px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}.rvHero h1{margin:12px 0 8px;color:#fff;font-size:clamp(42px,5vw,70px);line-height:.92;letter-spacing:-.06em}.rvHero p{margin:0;color:#e5e7eb;font-weight:850;line-height:1.45;max-width:920px}.rvStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}.rvStat{border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);padding:13px}.rvStat small{display:block;color:#fed7aa;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em}.rvStat b{display:block;color:#fff;font-size:24px;line-height:1.05;margin:4px 0}.rvStat span{color:#e5e7eb;font-size:12px;font-weight:800;line-height:1.35}
    .rvFilters{display:flex;flex-wrap:wrap;gap:8px}.rvFilters button{border:1px solid rgba(15,23,42,.12);border-radius:999px;background:#fffaf0;color:#101827;padding:10px 14px;font-weight:1000;cursor:pointer}.rvFilters button.active{background:#111827;color:#fff}
    .rvGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.rvCard{border:1px solid rgba(15,23,42,.12);border-left:7px solid #f97316;border-radius:28px;background:#fffaf0;padding:17px;box-shadow:0 16px 42px rgba(2,6,23,.09);display:grid;gap:11px}.rvCard.money{border-left-color:#16a34a}.rvCard.work{border-left-color:#2563eb}.rvCard.create{border-left-color:#f97316}.rvCard.guide{opacity:.82}.rvCardTop{display:flex;justify-content:space-between;gap:10px;align-items:center}.rvCardTop span{border-radius:999px;background:#fff7ed;color:#9a3412;padding:7px 10px;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:1000}.rvCardTop em{font-style:normal;color:#64748b;font-size:11px;font-weight:900}.rvCard h3{margin:0;color:#101827;font-size:24px;line-height:1;letter-spacing:-.04em}.rvCard p{margin:0;color:#475569;font-weight:850;line-height:1.4}.rvDetailGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.rvDetailGrid section{border:1px solid rgba(15,23,42,.10);border-radius:16px;background:#fff;padding:10px}.rvDetailGrid b{display:block;color:#101827;font-size:12px;font-weight:1000}.rvDetailGrid p{margin:4px 0 0;color:#475569;font-size:12px;font-weight:850;word-break:break-word}.rvCardActions,.rvActions{display:flex;flex-wrap:wrap;gap:8px}.rvCardActions button,.rvActions button{border:0;border-radius:15px;min-height:42px;padding:0 14px;background:#111827;color:#fff;font-weight:1000;cursor:pointer}.rvCardActions button:first-child,.rvActions button:first-child{background:#f97316;color:#111827}.rvCardActions button:last-child,.rvActions button:last-child{background:#fff;border:1px solid rgba(15,23,42,.14);color:#111827}
    .rvShade{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;background:rgba(15,23,42,.62);backdrop-filter:blur(10px);padding:18px}.rvModal{position:relative;width:min(1040px,100%);max-height:92vh;overflow:auto;border-radius:32px;background:#fffaf0;padding:20px;box-shadow:0 30px 100px rgba(2,6,23,.38);border:1px solid rgba(15,23,42,.14)}.rvClose{position:absolute;right:14px;top:14px;border:0;border-radius:999px;width:42px;height:42px;background:#111827;color:#fff;font-size:24px;font-weight:1000;cursor:pointer}.rvModal h2{margin:10px 0 6px;color:#101827;font-size:36px;line-height:.95;letter-spacing:-.05em}.rvModal header p{margin:0 44px 12px 0;color:#475569;font-weight:850;line-height:1.4}.rvModalGrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.7fr);gap:12px}.rvSafeBox,.rvEditor{border:1px solid rgba(15,23,42,.10);border-radius:20px;background:#fff;padding:14px;margin-top:10px}.rvSafeBox b{display:block;color:#101827;font-weight:1000}.rvSafeBox p{margin:5px 0 0;color:#475569;font-weight:850}.rvEditor{display:grid;gap:10px;margin-top:0}.rvEditor label{display:grid;gap:6px}.rvEditor span{font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em;color:#64748b}.rvEditor select,.rvEditor textarea{border:1px solid rgba(15,23,42,.14);border-radius:15px;background:#fff;color:#101827;padding:11px 12px;font-weight:900;outline:0}.rvEditor textarea{min-height:180px;resize:vertical}.rvActions{margin-top:12px}
    @media(max-width:900px){.rvRoot{padding:16px 12px 110px}.rvStats,.rvGrid,.rvModalGrid,.rvDetailGrid{grid-template-columns:1fr}.rvHero{border-radius:26px;padding:22px}.rvTop{align-items:flex-start}.rvTop a,.rvTop button{width:100%;text-align:center}.rvCardActions,.rvActions{display:grid}.rvCardActions button,.rvActions button{width:100%}.rvShade{align-items:start;overflow:auto}.rvModal{border-radius:24px;padding:16px}.rvModal h2{font-size:30px}}
  `}</style>;
}

export default function CommandDeskOperatorPageV3() {
  const [items, setItems] = React.useState([]);
  const [filter, setFilter] = React.useState("all");
  const [selected, setSelected] = React.useState(null);

  const refresh = React.useCallback(() => setItems(loadItems()), []);
  React.useEffect(() => { refresh(); const onUpdate = () => refresh(); window.addEventListener("storage", onUpdate); window.addEventListener("churvox:fresh-data-updated", onUpdate); return () => { window.removeEventListener("storage", onUpdate); window.removeEventListener("churvox:fresh-data-updated", onUpdate); }; }, [refresh]);

  const visible = items.length ? items : EMPTY_ITEMS;
  const filtered = filter === "all" ? visible : visible.filter((item) => item.category === filter);
  const counts = items.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + 1; return acc; }, {});

  function updateItem(item, patch, outcome) {
    const next = items.map((current) => current.id === item.id ? { ...current, ...patch, updatedAt: new Date().toISOString() } : current);
    saveItems(next);
    setItems(next);
    if (outcome) archiveItem({ ...item, ...patch }, outcome);
    setSelected(null);
  }
  function removeItem(item, patch, outcome) {
    const next = items.filter((current) => current.id !== item.id);
    saveItems(next);
    setItems(next);
    archiveItem({ ...item, ...patch }, outcome);
    setSelected(null);
  }
  function approve(item, patch = {}) { if (item.status === "guide") return setSelected(item); removeItem(item, { ...patch, status: "approved" }, "approved"); toast.success("Review item approved"); }
  function save(item, patch = {}) { if (item.status === "guide") return setSelected(null); updateItem(item, { ...patch, status: patch.status || "edited", ownerNote: patch.note || item.ownerNote || "" }); toast.success("Review edit saved"); }
  function ignore(item, patch = {}) { if (item.status === "guide") return setSelected(null); removeItem(item, { ...patch, status: "ignored" }, "ignored"); toast.success("Review item ignored"); }

  return (
    <main className="rvRoot">
      <Style />
      <div className="rvWrap">
        <section className="rvHero">
          <div className="rvTop"><span>Owner Review</span><a href="/dashboard#quickcreateai">Tell Churvox</a></div>
          <h1>Approve what Churvox prepared.</h1>
          <p>This is the holding tray for AI prepared admin work. Nothing sends, syncs, marks paid, creates payment files, or changes live records from here without your decision.</p>
          <div className="rvStats">
            <Stat label="Open" value={items.length} hint="Saved review items" />
            <Stat label="Money" value={counts.money || 0} hint="Draft invoices / follow-ups" />
            <Stat label="Work" value={counts.work || 0} hint="Job changes and searches" />
            <Stat label="Create" value={counts.create || 0} hint="New records needing check" />
          </div>
        </section>

        <nav className="rvFilters" aria-label="Review filters">
          {["all", "money", "work", "create", "other"].map((key) => <button key={key} className={filter === key ? "active" : ""} type="button" onClick={() => setFilter(key)}>{key === "all" ? "All" : key}</button>)}
        </nav>

        <section className="rvGrid">
          {filtered.map((item) => <ReviewCard key={item.id} item={item} onOpen={setSelected} onApprove={approve} onIgnore={ignore} />)}
        </section>
      </div>
      <ReviewModal item={selected} onClose={() => setSelected(null)} onSave={save} onApprove={approve} onIgnore={ignore} />
    </main>
  );
}
