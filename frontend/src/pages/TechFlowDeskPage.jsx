import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import WorkSlipModal from "../components/frontdesk/WorkSlipModal";

const asArray = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.actions) ? v.actions : [];
const rowId = (x) => String(x?.id || x?._id || "");
const money = (n) => `$${Number(n || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const actionLabel = { create_invoice_draft: "Invoice prepared", invoice_draft: "Invoice prepared", invoice_reminder: "Payment follow-up", assign_worker: "Crew move", quote_follow_up: "Quote follow-up", today_plan: "Daily plan", payroll_review: "Payroll review", missing_price: "Price gap", client_cleanup: "Client fix" };

function fromAction(action) {
  const id = rowId(action);
  const reason = action.reason || action.owner_facing_explanation || action.subtitle || action.summary || "Churvox prepared this for owner approval.";
  return { id: `a-${id}`, action_id: id, lane: "approve", label: actionLabel[action.action_type] || "Prepared move", title: action.title || actionLabel[action.action_type] || "Prepared owner move", detail: reason, cta: "Approve", facts: [action.recommendation ? ["Recommendation", action.recommendation] : null, action.generated_message ? ["Draft", action.generated_message] : null, action.related_type ? ["Source", action.related_type] : null].filter(Boolean) };
}

function fromJob(job, lane) {
  const id = rowId(job);
  const client = job.client_name || job.customer_name || "Client";
  const title = job.title || job.job_name || client;
  const worker = job.assigned_worker_name || job.worker_name || "Unassigned";
  const address = job.address || job.location || "No address saved";
  if (lane === "money") return { id: `jm-${id}`, lane, label: "Invoice opportunity", title: `Prepare invoice · ${title}`, detail: "Completed work has no linked invoice. Churvox pulled it into the money lane.", cta: "Prepare", facts: [["Client", client], ["Address", address], ["Status", job.status || "complete"]] };
  if (lane === "fix") return { id: `jf-${id}`, lane, label: "Blocked job", title: `Assign crew · ${title}`, detail: "No worker is assigned. Churvox surfaced it before the job stalls.", cta: "Assign", facts: [["Client", client], ["Worker", worker], ["Address", address]] };
  return { id: `j-${id}`, lane: "field", label: "Field movement", title, detail: "This work is moving in the field. Churvox keeps it visible without opening every job card.", cta: "Open", facts: [["Client", client], ["Worker", worker], ["Status", job.status || "scheduled"]] };
}

function fromInvoice(invoice) {
  const id = rowId(invoice);
  const customer = invoice.customer_name || invoice.client_name || "Client";
  const total = invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0;
  return { id: `i-${id}`, lane: "money", label: "Money item", title: `${customer} · ${money(total)}`, detail: "This invoice needs attention. Churvox keeps cashflow decisions visible.", cta: "Review", facts: [["Customer", customer], ["Amount", money(total)], ["Status", invoice.status || "open"]] };
}

const S = {
  page: { minHeight: "100vh", background: "radial-gradient(circle at 12% 8%, rgba(0,167,255,.18), transparent 30%), linear-gradient(140deg,#f5fbff,#eef5ff 50%,#dceeff)", color: "#142033", fontFamily: "Inter, system-ui, sans-serif" },
  top: { minHeight: 70, display: "flex", alignItems: "center", gap: 16, padding: "0 clamp(14px,3vw,40px)", background: "linear-gradient(90deg,#1d2d4a,#2764ff)", boxShadow: "0 16px 42px rgba(39,100,255,.22)", position: "sticky", top: 0, zIndex: 20 },
  logo: { display: "flex", textDecoration: "none" },
  nav: { display: "flex", gap: 4, flex: 1 },
  navA: { color: "rgba(255,255,255,.84)", textDecoration: "none", fontWeight: 850, fontSize: 13, padding: "9px 10px", borderRadius: 12 },
  run: { border: 0, borderRadius: 13, background: "#fff", color: "#1d2d4a", padding: "10px 14px", fontWeight: 950, boxShadow: "0 12px 30px rgba(20,32,51,.12)" },
  main: { padding: "clamp(16px,2.6vw,30px) clamp(14px,3vw,40px) 46px" },
  hero: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 250px", gap: 16, alignItems: "stretch" },
  heroCard: { background: "rgba(255,255,255,.94)", border: "1px solid #c9d8ef", borderRadius: 28, padding: "clamp(22px,3.2vw,34px)", boxShadow: "0 24px 70px rgba(35,58,102,.14)", backdropFilter: "blur(14px)" },
  kicker: { margin: 0, color: "#2764ff", textTransform: "uppercase", letterSpacing: ".15em", fontSize: 10, fontWeight: 950 },
  h1: { margin: "10px 0", fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(34px,4.8vw,68px)", lineHeight: .9, letterSpacing: "-.06em", color: "#142033" },
  lead: { color: "#61708a", fontSize: 16, lineHeight: 1.48, maxWidth: 860 },
  radar: { background: "linear-gradient(160deg,#1d2d4a,#2764ff)", borderRadius: 28, padding: 18, color: "#fff", boxShadow: "0 24px 70px rgba(39,100,255,.25)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignContent: "center" },
  modeBar: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 16 },
  mode: { border: "1px solid #c9d8ef", background: "#fff", color: "#142033", borderRadius: 18, padding: 14, textAlign: "left", cursor: "pointer", boxShadow: "0 14px 34px rgba(35,58,102,.09)" },
  modeOn: { background: "linear-gradient(135deg,#2764ff,#00a7ff)", color: "#fff", borderColor: "#8ed7ff", boxShadow: "0 16px 42px rgba(39,100,255,.22)" },
  focus: { marginTop: 16, background: "rgba(255,255,255,.95)", border: "1px solid #c9d8ef", borderRadius: 30, padding: "clamp(22px,3.6vw,36px)", boxShadow: "0 24px 78px rgba(35,58,102,.15)" },
  h2: { margin: 0, fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(28px,3.6vw,50px)", lineHeight: .95, letterSpacing: "-.055em", color: "#142033" },
  facts: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 18 },
  fact: { background: "#eef5ff", border: "1px solid #c9d8ef", borderRadius: 16, padding: 13 },
  open: { border: 0, borderRadius: 14, background: "linear-gradient(135deg,#2764ff,#00a7ff)", color: "#fff", padding: "12px 16px", fontWeight: 950, marginTop: 20, boxShadow: "0 16px 38px rgba(39,100,255,.24)" },
  conveyor: { marginTop: 16, background: "linear-gradient(135deg,#eaf3ff,#ffffff)", border: "1px solid #c9d8ef", borderRadius: 26, padding: 16, boxShadow: "0 18px 58px rgba(35,58,102,.1)" },
  rail: { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 },
  card: { minWidth: 245, textAlign: "left", border: "1px solid #c9d8ef", background: "#fff", borderRadius: 18, padding: 15, cursor: "pointer" },
  cardOn: { borderColor: "#2764ff", boxShadow: "inset 0 -4px 0 #00a7ff, 0 14px 32px rgba(39,100,255,.12)" },
  pill: { display: "inline-flex", background: "#eef5ff", color: "#1d2d4a", borderRadius: 999, padding: "7px 9px", fontSize: 11, fontWeight: 950 },
};

function Stat({ label, value }) {
  return <div><span style={{ color: "rgba(255,255,255,.72)", textTransform: "uppercase", letterSpacing: ".12em", fontSize: 10, fontWeight: 900 }}>{label}</span><strong style={{ display: "block", fontFamily: "Outfit, Inter, sans-serif", fontSize: 32, lineHeight: .95 }}>{value}</strong></div>;
}

export default function TechFlowDeskPage() {
  const { get, post } = useApi();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [lane, setLane] = useState("approve");
  const [selected, setSelected] = useState(null);
  const [modalItem, setModalItem] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [snap, actionRes, jobRes, invoiceRes] = await Promise.all([get("/ai-operator/command-snapshot"), get("/ai-operator/actions"), get("/jobs"), get("/invoices")]);
    if (snap.success) setSnapshot(snap.data || null);
    if (actionRes.success) setActions(asArray(actionRes.data));
    if (jobRes.success) setJobs(asArray(jobRes.data));
    if (invoiceRes.success) setInvoices(asArray(invoiceRes.data));
    setLoading(false);
  }, [get]);
  useEffect(() => { load(); }, [load]);

  const approve = useMemo(() => actions.filter((a) => ["pending", "edited", "ready"].includes(String(a.status || "").toLowerCase())).map(fromAction), [actions]);
  const fix = useMemo(() => jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(String(j.status || "").toLowerCase())).slice(0, 12).map((j) => fromJob(j, "fix")), [jobs]);
  const field = useMemo(() => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(String(j.status || "").toLowerCase())).slice(0, 12).map((j) => fromJob(j, "field")), [jobs]);
  const moneyLane = useMemo(() => {
    const readyJobs = jobs.filter((j) => ["completed", "done", "complete"].includes(String(j.status || "").toLowerCase()) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)).slice(0, 8).map((j) => fromJob(j, "money"));
    const openInvoices = invoices.filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending"].includes(String(i.status || "").toLowerCase())).slice(0, 8).map(fromInvoice);
    return [...readyJobs, ...openInvoices];
  }, [jobs, invoices]);
  const lanes = { approve, fix, field, money: moneyLane };
  const visible = lanes[lane] || [];
  const current = selected && selected.lane === lane ? selected : visible[0] || null;

  const runScan = async () => { setScanning(true); const res = await post("/smart-hub/scan", {}); setScanning(false); if (res.success) { toast.success("TechFlow scan complete"); load(); } else toast.error(res.error || "Scan failed"); };
  const approveItem = async (item) => { if (!item?.action_id) return; setBusy(true); const res = await post(`/ai-operator/actions/${item.action_id}/approve`, {}); setBusy(false); if (res.success) { toast.success("Approved"); setModalItem(null); load(); } else toast.error(res.error || "Could not approve"); };
  const rejectItem = async (item) => { if (!item?.action_id) return; setBusy(true); const res = await post(`/ai-operator/actions/${item.action_id}/reject`, {}); setBusy(false); if (res.success) { toast.success("Dismissed"); setModalItem(null); load(); } else toast.error(res.error || "Could not dismiss"); };
  const modeData = [["approve", "Ready", approve.length], ["fix", "Fix", fix.length], ["field", "Field", field.length], ["money", "Money", moneyLane.length]];

  return <div style={S.page}><header style={S.top}><Link to="/" style={S.logo}><ChurvoxLogo /></Link><nav style={S.nav}>{["jobs", "clients", "quotes", "invoices", "team", "payroll"].map((x) => <Link key={x} to={`/${x}`} style={S.navA}>{x[0].toUpperCase() + x.slice(1)}</Link>)}</nav><button type="button" style={S.run} onClick={runScan} disabled={scanning}>{scanning ? "Scanning…" : "Run TechFlow"}</button><button type="button" style={S.run} onClick={async () => { await logout(); navigate("/login", { replace: true }); }}>{(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}</button></header><main style={S.main}><section style={S.hero}><div style={S.heroCard}><p style={S.kicker}>TechFlow Cockpit</p><h1 style={S.h1}>One prepared move at a time.</h1><p style={S.lead}>{snapshot?.next_best_move || "Pick a mode, see the next prepared decision, approve what matters."}</p></div><aside style={S.radar}><Stat label="Approve" value={approve.length} /><Stat label="Fix" value={fix.length} /><Stat label="Field" value={field.length} /><Stat label="Money" value={moneyLane.length} /></aside></section><section style={S.modeBar}>{modeData.map(([key, title, count]) => <button key={key} type="button" style={{ ...S.mode, ...(lane === key ? S.modeOn : {}) }} onClick={() => { setLane(key); setSelected(null); }}><span style={{ fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".12em" }}>{title}</span><strong style={{ display: "block", fontFamily: "Outfit, Inter, sans-serif", fontSize: 30 }}>{count}</strong></button>)}</section><section style={S.focus}>{current ? <><p style={S.kicker}>{current.label}</p><h2 style={S.h2}>{current.title}</h2><p style={S.lead}>{current.detail}</p><div style={S.facts}>{(current.facts || []).slice(0, 3).map(([a, b]) => <div key={a} style={S.fact}><span style={{ color: "#61708a", fontSize: 12, fontWeight: 900 }}>{a}</span><b style={{ display: "block", marginTop: 6 }}>{b}</b></div>)}</div><button type="button" style={S.open} onClick={() => setModalItem(current)}>Open Work Slip</button></> : <p style={S.lead}>{loading ? "Loading TechFlow…" : "No prepared move in this mode."}</p>}</section><section style={S.conveyor}><p style={S.kicker}>Decision conveyor · {visible.length} items</p><div style={S.rail}>{visible.length ? visible.map((item) => <button key={item.id} type="button" style={{ ...S.card, ...(current?.id === item.id ? S.cardOn : {}) }} onClick={() => setSelected(item)}><span style={S.pill}>{item.cta}</span><h3 style={{ fontSize: 18, lineHeight: 1.1, margin: "10px 0 6px" }}>{item.title}</h3><p style={{ color: "#61708a", fontSize: 13, lineHeight: 1.4 }}>{item.detail}</p></button>) : <p style={S.lead}>No work in this mode.</p>}</div></section></main><WorkSlipModal open={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} onApprove={approveItem} onReject={rejectItem} busy={busy} /></div>;
}
