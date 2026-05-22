import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import WorkSlipModal from "../components/frontdesk/WorkSlipModal";
import OnboardingChecklist from "../components/frontdesk/OnboardingChecklist";

const safeArray = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.actions) ? v.actions : [];

const money = (n) => `$${Number(n || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const idOf = (x) => String(x?.id || x?._id || "");

const actionLabels = {
  create_invoice_draft: "Invoice draft",
  invoice_draft: "Invoice draft",
  invoice_reminder: "Invoice reminder",
  assign_worker: "Crew assignment",
  quote_follow_up: "Quote follow-up",
  today_plan: "Today's plan",
  payroll_review: "Payroll review",
  missing_price: "Missing price",
  client_cleanup: "Client cleanup",
};

function actionItem(a) {
  const id = idOf(a);
  const reason = a.reason || a.owner_facing_explanation || a.subtitle || "Churvox prepared this action for approval.";
  return {
    id,
    action_id: id,
    zone: "approve",
    title: a.title || "AI prepared action",
    subtitle: reason,
    summary: a.what_happens || reason,
    reasoning: reason,
    type_label: actionLabels[a.action_type] || String(a.action_type || "AI action").replace(/_/g, " "),
    risk: String(a.risk || a.risk_level || "").toLowerCase() || null,
    facts: [
      a.recommendation ? { label: "Recommendation", value: a.recommendation } : null,
      a.generated_message ? { label: "Prepared draft", value: a.generated_message } : null,
      a.related_type ? { label: "Related", value: String(a.related_type) } : null,
    ].filter(Boolean),
    related: a.related_id ? { type: String(a.related_type || ""), id: String(a.related_id) } : null,
  };
}

function jobItem(j, kind) {
  const id = idOf(j);
  const client = j.client_name || j.customer_name || "No client";
  const address = j.address || j.location || "No address";
  if (kind === "ready-invoice") return {
    id: `invoice-${id}`, zone: "money", title: `Ready to invoice · ${j.title || client}`, subtitle: `${client} · completed`, summary: "Completed job waiting to become a draft invoice.", reasoning: "The job is complete and no invoice is linked yet. Churvox is surfacing it so cashflow does not sit idle.", type_label: "Completed job", cta: "Invoice", facts: [{ label: "Client", value: client }, { label: "Address", value: address }], related: { type: "job", id }
  };
  if (kind === "field") return {
    id: `field-${id}`, zone: "field", title: j.title || client, subtitle: `${j.assigned_worker_name || "Unassigned"} · ${address}`, summary: `Status: ${j.status || "scheduled"}`, reasoning: "This job is active or scheduled today. Review the crew and status.", type_label: "Field job", cta: "Open", facts: [{ label: "Worker", value: j.assigned_worker_name || "Unassigned" }, { label: "Client", value: client }, { label: "Address", value: address }], related: { type: "job", id }
  };
  return {
    id: `fix-${id}`, zone: "fixing", title: `Unassigned · ${j.title || client}`, subtitle: `${client} · ${address}`, summary: "This job has no worker assigned.", reasoning: "No assigned worker is saved against this job. Churvox flagged it before it blocks the run sheet.", type_label: "Unassigned job", cta: "Assign", facts: [{ label: "Client", value: client }, { label: "Address", value: address }, { label: "Status", value: j.status || "—" }], related: { type: "job", id }
  };
}

function invoiceItem(inv) {
  const id = idOf(inv);
  const total = inv.balance_due || inv.balance || inv.total || inv.amount || 0;
  return { id: `money-${id}`, zone: "money", title: `${inv.customer_name || inv.client_name || "Client"} · ${money(total)}`, subtitle: `Invoice ${inv.invoice_number || id.slice(-6)} · ${inv.status || "open"}`, summary: "Invoice needs owner attention.", reasoning: "Money desk item surfaced from open, draft, unpaid, or overdue invoices.", type_label: "Invoice", cta: "Review", facts: [{ label: "Customer", value: inv.customer_name || inv.client_name || "—" }, { label: "Amount", value: money(total) }, { label: "Status", value: inv.status || "—" }], related: { type: "invoice", id } };
}

function MiniStat({ label, value, accent }) {
  return <div className="exec-stat"><span style={{ background: accent || "#BFFF2F" }} /> <small>{label}</small><strong>{value}</strong></div>;
}

function WorkRow({ item, onClick, primary }) {
  return <button type="button" className={primary ? "exec-row exec-row--primary" : "exec-row"} onClick={() => onClick(item)}><div><b>{item.title}</b><p>{item.subtitle || item.summary}</p></div><em>{item.cta || "Review"}</em></button>;
}

function RailCard({ title, items, empty, onClick }) {
  return <section className="exec-rail-card"><header><b>{title}</b><span>{items.length}</span></header><div>{items.length ? items.slice(0, 4).map((it) => <WorkRow key={it.id} item={it} onClick={onClick} />) : <p className="exec-empty">{empty}</p>}</div></section>;
}

export default function ExecutiveFrontDeskPage() {
  const { get, post } = useApi();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [openItem, setOpenItem] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [snap, act, job, inv] = await Promise.all([get("/ai-operator/command-snapshot"), get("/ai-operator/actions"), get("/jobs"), get("/invoices")]);
    if (snap.success) setSnapshot(snap.data || null);
    if (act.success) setActions(safeArray(act.data));
    if (job.success) setJobs(safeArray(job.data));
    if (inv.success) setInvoices(safeArray(inv.data));
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const approve = useMemo(() => actions.filter((a) => ["pending", "edited"].includes(String(a.status || "").toLowerCase())).map(actionItem), [actions]);
  const fixing = useMemo(() => jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(String(j.status || "").toLowerCase())).slice(0, 8).map((j) => jobItem(j, "fix")), [jobs]);
  const field = useMemo(() => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(String(j.status || "").toLowerCase())).slice(0, 8).map((j) => jobItem(j, "field")), [jobs]);
  const moneyItems = useMemo(() => {
    const ready = jobs.filter((j) => ["completed", "done", "complete"].includes(String(j.status || "").toLowerCase()) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)).slice(0, 5).map((j) => jobItem(j, "ready-invoice"));
    const inv = invoices.filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending"].includes(String(i.status || "").toLowerCase())).slice(0, 6).map(invoiceItem);
    return [...ready, ...inv];
  }, [jobs, invoices]);

  const runScan = async () => { setScanning(true); const res = await post("/smart-hub/scan", {}); setScanning(false); if (res.success) { toast.success("AI scan complete"); load(); } else toast.error(res.error || "Scan failed"); };
  const approveItem = async (item) => { if (!item?.action_id) return; setBusy(true); const res = await post(`/ai-operator/actions/${item.action_id}/approve`, {}); setBusy(false); if (res.success) { toast.success("Approved"); setOpenItem(null); load(); } else toast.error(res.error || "Could not approve"); };
  const rejectItem = async (item) => { if (!item?.action_id) return; setBusy(true); const res = await post(`/ai-operator/actions/${item.action_id}/reject`, {}); setBusy(false); if (res.success) { toast.success("Dismissed"); setOpenItem(null); load(); } else toast.error(res.error || "Could not reject"); };
  const signOut = async () => { await logout(); navigate("/login", { replace: true }); };

  const urgent = snapshot?.urgent || {};
  const leadItems = approve.length ? approve : [...fixing, ...moneyItems, ...field].slice(0, 10);
  const selected = openItem || leadItems[0] || null;

  return <div className="exec-desk" data-testid="front-desk-page"><header className="exec-top"><Link to="/" className="exec-logo"><ChurvoxLogo /></Link><nav><Link to="/jobs">Jobs</Link><Link to="/clients">Clients</Link><Link to="/quotes">Quotes</Link><Link to="/invoices">Invoices</Link><Link to="/team">Team</Link><Link to="/payroll">Payroll</Link></nav><button onClick={runScan} disabled={scanning}>{scanning ? "Scanning…" : "Run AI scan"}</button><button className="exec-user" onClick={signOut}>{(user?.name || user?.email || "U").slice(0,1).toUpperCase()}</button></header><main className="exec-main"><section className="exec-hero"><div><p className="exec-kicker">AI Operator Front Desk</p><h1>Today’s admin, prepared for approval.</h1><p>{snapshot?.next_best_move || "Churvox watches the moving parts, prepares the next action, and keeps you in control."}</p></div><div className="exec-stats"><MiniStat label="Approvals" value={snapshot?.approvals?.total_pending ?? approve.length} /><MiniStat label="Active jobs" value={urgent.active_jobs || field.length} accent="#15171A" /><MiniStat label="Needs fixing" value={fixing.length} accent="#B7791F" /><MiniStat label="Money desk" value={moneyItems.length} accent="#18794E" /></div></section><OnboardingChecklist /><section className="exec-workbench"><div className="exec-queue"><div className="exec-title"><span>01</span><div><h2>Operator queue</h2><p>{loading ? "Loading the workbench…" : "The highest-value actions Churvox can prepare right now."}</p></div></div><div className="exec-list">{leadItems.length ? leadItems.map((it, idx) => <WorkRow key={it.id} item={it} onClick={setOpenItem} primary={idx === 0} />) : <p className="exec-empty">No urgent work waiting. Run AI scan when new jobs or invoices come in.</p>}</div></div><aside className="exec-sheet"><p className="exec-kicker">Selected Work Slip</p>{selected ? <><h2>{selected.title}</h2><p>{selected.reasoning || selected.summary}</p><div className="exec-facts">{(selected.facts || []).slice(0,4).map((f, i) => <div key={i}><span>{f.label}</span><b>{f.value}</b></div>)}</div><button onClick={() => setOpenItem(selected)}>Open Work Slip</button></> : <p>No item selected.</p>}<small>Approval-first: Churvox prepares. You approve.</small></aside><div className="exec-rail"><RailCard title="Needs fixing" items={fixing} empty="No blockers" onClick={setOpenItem}/><RailCard title="Field & crew" items={field} empty="No active jobs" onClick={setOpenItem}/><RailCard title="Money desk" items={moneyItems} empty="Money desk clear" onClick={setOpenItem}/></div></section></main><WorkSlipModal open={!!openItem} onClose={() => setOpenItem(null)} item={openItem} onApprove={approveItem} onReject={rejectItem} busy={busy}/><style>{`
.exec-desk{min-height:100vh;background:#e9e4d8;color:#101114;font-family:Inter,system-ui,sans-serif}.exec-top{position:sticky;top:0;z-index:40;height:74px;background:#15171a;color:#faf8f1;display:flex;align-items:center;gap:20px;padding:0 clamp(16px,3vw,46px);box-shadow:0 18px 50px rgba(16,17,20,.20)}.exec-logo{display:flex;align-items:center;text-decoration:none;filter:invert(1) grayscale(1) brightness(2)}.exec-top nav{display:flex;gap:4px;flex:1}.exec-top nav a{color:rgba(250,248,241,.72);text-decoration:none;font-weight:700;font-size:13px;padding:10px 12px;border-radius:10px}.exec-top nav a:hover{background:#242830;color:#fff}.exec-top button{border:0;border-radius:10px;font-weight:900;padding:11px 16px;background:#bfff2f;color:#101114;cursor:pointer}.exec-user{width:42px!important;height:42px!important;padding:0!important;background:#242830!important;color:#bfff2f!important}.exec-main{padding:28px clamp(16px,3vw,46px) 46px}.exec-hero{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(420px,.8fr);gap:22px;align-items:stretch}.exec-kicker{text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:900;color:#5f6670;margin:0 0 12px}.exec-hero>div:first-child{background:#faf8f1;border:1px solid #cfc7b8;padding:34px;border-radius:16px;box-shadow:0 20px 60px rgba(16,17,20,.10)}.exec-hero h1{font-family:Outfit,Inter,sans-serif;font-size:clamp(44px,6vw,82px);line-height:.92;letter-spacing:-.065em;margin:0;color:#101114;max-width:980px}.exec-hero p{max-width:760px;font-size:17px;line-height:1.55;color:#5f6670}.exec-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px}.exec-stat{background:#15171a;color:#faf8f1;border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:8px;min-height:122px;box-shadow:0 20px 60px rgba(16,17,20,.16)}.exec-stat span{width:10px;height:10px;border-radius:50%;display:block}.exec-stat small{text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:rgba(250,248,241,.62);font-weight:900}.exec-stat strong{font-family:Outfit,Inter,sans-serif;font-size:34px;line-height:1}.exec-workbench{margin-top:22px;display:grid;grid-template-columns:minmax(480px,1.2fr) minmax(360px,.72fr);grid-template-areas:'queue sheet' 'queue rail';gap:18px}.exec-queue{grid-area:queue;background:#faf8f1;border:1px solid #afa594;border-radius:16px;box-shadow:0 34px 90px rgba(16,17,20,.15);padding:20px;min-height:620px}.exec-title{display:flex;gap:18px;border-bottom:1px solid #cfc7b8;padding-bottom:18px;margin-bottom:16px}.exec-title span{font-family:Outfit,Inter,sans-serif;font-size:56px;font-weight:900;line-height:.8;color:#15171a}.exec-title h2{margin:0;font-family:Outfit,Inter,sans-serif;font-size:34px;letter-spacing:-.04em}.exec-title p{margin:4px 0 0;color:#5f6670}.exec-list{display:grid;gap:10px}.exec-row{width:100%;border:1px solid #cfc7b8;background:#fff;text-align:left;border-radius:12px;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer}.exec-row--primary{border-color:#15171a;box-shadow:inset 4px 0 0 #bfff2f}.exec-row b{display:block;font-size:15px;color:#101114}.exec-row p{margin:4px 0 0;color:#5f6670;font-size:13px;line-height:1.35}.exec-row em{font-style:normal;font-size:12px;font-weight:900;background:#15171a;color:#faf8f1;border-radius:999px;padding:7px 10px;white-space:nowrap}.exec-sheet{grid-area:sheet;background:#15171a;color:#faf8f1;border-radius:16px;padding:24px;box-shadow:0 28px 80px rgba(16,17,20,.20);min-height:330px}.exec-sheet .exec-kicker{color:#bfff2f}.exec-sheet h2{font-family:Outfit,Inter,sans-serif;font-size:32px;line-height:1;letter-spacing:-.04em;margin:0 0 12px;color:#faf8f1}.exec-sheet p{color:rgba(250,248,241,.72);line-height:1.5}.exec-sheet button{width:100%;border:0;border-radius:10px;padding:13px 16px;background:#bfff2f;color:#101114;font-weight:900;margin-top:16px}.exec-sheet small{display:block;margin-top:14px;color:rgba(250,248,241,.52)}.exec-facts{display:grid;gap:8px;margin-top:16px}.exec-facts div{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(250,248,241,.14);padding-bottom:8px}.exec-facts span{color:rgba(250,248,241,.55)}.exec-facts b{color:#faf8f1;text-align:right}.exec-rail{grid-area:rail;display:grid;gap:14px}.exec-rail-card{background:#fff;border:1px solid #cfc7b8;border-radius:14px;padding:14px;box-shadow:0 14px 40px rgba(16,17,20,.08)}.exec-rail-card header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.exec-rail-card header b{font-size:14px}.exec-rail-card header span{background:#f3efe6;border-radius:999px;padding:4px 8px;font-size:12px;font-weight:900}.exec-empty{color:#5f6670;margin:0;padding:16px}@media(max-width:1120px){.exec-hero,.exec-workbench{grid-template-columns:1fr;grid-template-areas:none}.exec-queue,.exec-sheet,.exec-rail{grid-area:auto}.exec-top nav{display:none}}@media(max-width:620px){.exec-main{padding:16px 12px 32px}.exec-hero h1{font-size:42px}.exec-stats{grid-template-columns:1fr 1fr}.exec-stat{min-height:94px;padding:14px}.exec-stat strong{font-size:26px}.exec-queue{min-height:unset;padding:14px}.exec-row{align-items:flex-start;flex-direction:column}.exec-top{height:64px;padding:0 12px}.exec-top button{padding:10px 12px}.exec-title span{font-size:38px}.exec-title h2{font-size:27px}}
`}</style></div>;
}
