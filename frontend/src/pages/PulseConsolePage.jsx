import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import WorkSlipModal from "../components/frontdesk/WorkSlipModal";

const asList = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.actions) ? v.actions : [];
const getId = (x) => String(x?.id || x?._id || "");
const cash = (n) => `$${Number(n || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const actionName = { create_invoice_draft: "Invoice prepared", invoice_draft: "Invoice prepared", invoice_reminder: "Payment follow-up", assign_worker: "Crew move", quote_follow_up: "Quote follow-up", today_plan: "Daily plan", payroll_review: "Payroll review", missing_price: "Price gap", client_cleanup: "Client fix" };

function actionMove(action) {
  const id = getId(action);
  const detail = action.reason || action.owner_facing_explanation || action.subtitle || action.summary || "Churvox prepared this for owner approval.";
  return { id: `a-${id}`, action_id: id, lane: "approve", label: actionName[action.action_type] || "Prepared move", title: action.title || actionName[action.action_type] || "Prepared owner move", detail, cta: "Approve", facts: [action.recommendation ? ["Recommendation", action.recommendation] : null, action.generated_message ? ["Draft", action.generated_message] : null, action.related_type ? ["Source", action.related_type] : null].filter(Boolean) };
}

function jobMove(job, lane) {
  const id = getId(job); const client = job.client_name || job.customer_name || "Client"; const title = job.title || job.job_name || client; const worker = job.assigned_worker_name || job.worker_name || "Unassigned"; const address = job.address || job.location || "No address saved";
  if (lane === "money") return { id: `jm-${id}`, lane, label: "Invoice opportunity", title: `Invoice · ${title}`, detail: "Completed work has no linked invoice. Churvox pulled it into the money lane.", cta: "Prepare", facts: [["Client", client], ["Address", address], ["Status", job.status || "complete"]] };
  if (lane === "fix") return { id: `jf-${id}`, lane, label: "Blocked job", title: `Assign crew · ${title}`, detail: "No worker is assigned. Churvox surfaced it before the job stalls.", cta: "Assign", facts: [["Client", client], ["Worker", worker], ["Address", address]] };
  return { id: `j-${id}`, lane: "field", label: "Field movement", title, detail: "This work is moving in the field. Churvox keeps it visible without opening every job card.", cta: "Open", facts: [["Client", client], ["Worker", worker], ["Status", job.status || "scheduled"]] };
}

function invoiceMove(invoice) {
  const id = getId(invoice); const customer = invoice.customer_name || invoice.client_name || "Client"; const total = invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0;
  return { id: `i-${id}`, lane: "money", label: "Money item", title: `${customer} · ${cash(total)}`, detail: "This invoice needs attention. Churvox keeps cashflow decisions visible.", cta: "Review", facts: [["Customer", customer], ["Amount", cash(total)], ["Status", invoice.status || "open"]] };
}

const C = { ink: "#263238", deep: "#36413f", clay: "#f0e7d8", paper: "#fffaf0", mint: "#36b38b", mintDark: "#13795b", copper: "#d76f30", amber: "#f3a72f", plum: "#7d3f72", line: "#d8cbb8", muted: "#6d665d" };

const S = {
  page: { minHeight: "100vh", background: `radial-gradient(circle at 16% 8%, rgba(54,179,139,.24), transparent 28%), radial-gradient(circle at 86% 14%, rgba(215,111,48,.22), transparent 30%), linear-gradient(135deg,#fbf4e9,#f0e7d8 52%,#e4eadf)`, color: C.ink, fontFamily: "Inter, system-ui, sans-serif" },
  top: { minHeight: 70, display: "flex", alignItems: "center", gap: 16, padding: "0 clamp(14px,3vw,40px)", background: `linear-gradient(90deg, ${C.deep}, #4f5b4f)`, borderBottom: "1px solid rgba(255,255,255,.22)", boxShadow: "0 16px 42px rgba(38,50,56,.18)", position: "sticky", top: 0, zIndex: 20 },
  logo: { display: "flex", textDecoration: "none" }, nav: { display: "flex", gap: 4, flex: 1 }, navA: { color: "rgba(255,250,240,.86)", textDecoration: "none", fontWeight: 850, fontSize: 13, padding: "9px 10px", borderRadius: 12 }, run: { border: 0, borderRadius: 14, background: C.paper, color: C.deep, padding: "11px 15px", fontWeight: 950, boxShadow: "0 14px 34px rgba(38,50,56,.16)" }, avatar: { border: 0, borderRadius: 14, background: `linear-gradient(135deg, ${C.mint}, ${C.copper})`, color: "#fff", padding: "11px 15px", fontWeight: 950 },
  main: { padding: "clamp(16px,2.8vw,32px) clamp(14px,3vw,42px) 48px" },
  board: { display: "grid", gridTemplateColumns: "minmax(230px,.62fr) minmax(0,1.25fr) minmax(260px,.72fr)", gap: 16, alignItems: "stretch" },
  tile: { background: "rgba(255,250,240,.94)", border: `1px solid ${C.line}`, borderRadius: 28, boxShadow: "0 22px 68px rgba(38,50,56,.13)", backdropFilter: "blur(14px)" },
  intro: { padding: 22, minHeight: 390, display: "flex", flexDirection: "column", justifyContent: "space-between" },
  kicker: { margin: 0, color: C.mintDark, textTransform: "uppercase", letterSpacing: ".15em", fontSize: 10, fontWeight: 950 },
  h1: { margin: "10px 0", fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(30px,4.2vw,60px)", lineHeight: .9, letterSpacing: "-.06em", color: C.ink },
  lead: { color: C.muted, fontSize: 15, lineHeight: 1.5 },
  dial: { width: 172, height: 172, borderRadius: "50%", alignSelf: "center", display: "grid", placeItems: "center", background: `conic-gradient(${C.mint} 0 42%, ${C.copper} 42% 66%, ${C.amber} 66% 82%, #d8cbb8 82% 100%)`, boxShadow: "0 22px 55px rgba(54,179,139,.2)" },
  dialInner: { width: 122, height: 122, borderRadius: "50%", background: C.paper, display: "grid", placeItems: "center", textAlign: "center" },
  command: { padding: "clamp(22px,3.5vw,36px)", minHeight: 390, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 18 },
  h2: { margin: 0, fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(28px,3.7vw,52px)", lineHeight: .92, letterSpacing: "-.055em", color: C.ink },
  facts: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 16 },
  fact: { background: "#f7eddf", border: `1px solid ${C.line}`, borderRadius: 17, padding: 13 },
  action: { border: 0, borderRadius: 16, background: `linear-gradient(135deg, ${C.mint}, ${C.copper})`, color: "#fff", padding: "13px 17px", fontWeight: 950, width: "max-content", boxShadow: "0 18px 42px rgba(215,111,48,.2)" },
  lanes: { padding: 16, display: "grid", gap: 10 },
  lane: { border: `1px solid ${C.line}`, background: C.paper, color: C.ink, borderRadius: 18, padding: 14, textAlign: "left", cursor: "pointer", fontWeight: 900 },
  laneOn: { background: `linear-gradient(135deg, ${C.mint}, ${C.copper})`, color: "#fff", borderColor: "transparent", boxShadow: "0 16px 38px rgba(54,179,139,.18)" },
  lower: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 16, marginTop: 16 },
  queue: { padding: 16, overflow: "hidden" }, rail: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginTop: 12 },
  card: { textAlign: "left", border: `1px solid ${C.line}`, background: C.paper, borderRadius: 18, padding: 15, cursor: "pointer", minHeight: 142 }, cardOn: { borderColor: C.mint, boxShadow: `inset 0 4px 0 ${C.mint}, 0 14px 34px rgba(54,179,139,.13)` },
  timeline: { padding: 18, background: `linear-gradient(160deg, ${C.deep}, #4f5b4f)`, color: C.paper, borderRadius: 28, boxShadow: "0 22px 68px rgba(38,50,56,.18)" }, step: { display: "grid", gridTemplateColumns: "30px 1fr", gap: 10, alignItems: "start", marginTop: 14 }, dot: { width: 23, height: 23, borderRadius: "50%", background: C.mint, boxShadow: "0 0 0 7px rgba(54,179,139,.18)" }, pill: { display: "inline-flex", background: "#e5f4ec", color: C.ink, borderRadius: 999, padding: "7px 9px", fontSize: 11, fontWeight: 950 }
};

export default function PulseConsolePage() {
  const { get, post } = useApi(); const { user, logout } = useAuth(); const navigate = useNavigate();
  const [loading, setLoading] = useState(true); const [scanning, setScanning] = useState(false); const [snapshot, setSnapshot] = useState(null); const [actions, setActions] = useState([]); const [jobs, setJobs] = useState([]); const [invoices, setInvoices] = useState([]); const [lane, setLane] = useState("approve"); const [selected, setSelected] = useState(null); const [modalItem, setModalItem] = useState(null); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setLoading(true); const [snap, actionRes, jobRes, invoiceRes] = await Promise.all([get("/ai-operator/command-snapshot"), get("/ai-operator/actions"), get("/jobs"), get("/invoices")]); if (snap.success) setSnapshot(snap.data || null); if (actionRes.success) setActions(asList(actionRes.data)); if (jobRes.success) setJobs(asList(jobRes.data)); if (invoiceRes.success) setInvoices(asList(invoiceRes.data)); setLoading(false); }, [get]);
  useEffect(() => { load(); }, [load]);
  const approve = useMemo(() => actions.filter((a) => ["pending", "edited", "ready"].includes(String(a.status || "").toLowerCase())).map(actionMove), [actions]);
  const fix = useMemo(() => jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(String(j.status || "").toLowerCase())).slice(0, 12).map((j) => jobMove(j, "fix")), [jobs]);
  const field = useMemo(() => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(String(j.status || "").toLowerCase())).slice(0, 12).map((j) => jobMove(j, "field")), [jobs]);
  const moneyLane = useMemo(() => { const readyJobs = jobs.filter((j) => ["completed", "done", "complete"].includes(String(j.status || "").toLowerCase()) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)).slice(0, 8).map((j) => jobMove(j, "money")); const openInvoices = invoices.filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending"].includes(String(i.status || "").toLowerCase())).slice(0, 8).map(invoiceMove); return [...readyJobs, ...openInvoices]; }, [jobs, invoices]);
  const lanesObj = { approve, fix, field, money: moneyLane }; const visible = lanesObj[lane] || []; const current = selected && selected.lane === lane ? selected : visible[0] || null; const preparedTotal = approve.length + fix.length + field.length + moneyLane.length;
  const runScan = async () => { setScanning(true); const res = await post("/smart-hub/scan", {}); setScanning(false); if (res.success) { toast.success("Console scan complete"); load(); } else toast.error(res.error || "Scan failed"); };
  const approveItem = async (item) => { if (!item?.action_id) return; setBusy(true); const res = await post(`/ai-operator/actions/${item.action_id}/approve`, {}); setBusy(false); if (res.success) { toast.success("Approved"); setModalItem(null); load(); } else toast.error(res.error || "Could not approve"); };
  const rejectItem = async (item) => { if (!item?.action_id) return; setBusy(true); const res = await post(`/ai-operator/actions/${item.action_id}/reject`, {}); setBusy(false); if (res.success) { toast.success("Dismissed"); setModalItem(null); load(); } else toast.error(res.error || "Could not dismiss"); };

  return <div style={S.page}><header style={S.top}><Link to="/" style={S.logo}><ChurvoxLogo /></Link><nav style={S.nav}>{["jobs", "clients", "quotes", "invoices", "team", "payroll"].map((x) => <Link key={x} to={`/${x}`} style={S.navA}>{x[0].toUpperCase() + x.slice(1)}</Link>)}</nav><button type="button" style={S.run} onClick={runScan} disabled={scanning}>{scanning ? "Scanning…" : "Run Console"}</button><button type="button" style={S.avatar} onClick={async () => { await logout(); navigate("/login", { replace: true }); }}>{(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}</button></header><main style={S.main}><section style={S.board}><aside style={{ ...S.tile, ...S.intro }}><div><p style={S.kicker}>Owner console</p><h1 style={S.h1}>Admin prepared. Decisions ready.</h1><p style={S.lead}>{snapshot?.next_best_move || "Churvox checks the business, prepares the admin, and turns it into owner decisions."}</p></div><div style={S.dial}><div style={S.dialInner}><p style={S.kicker}>Prepared</p><strong style={{ fontFamily: "Outfit,Inter,sans-serif", fontSize: 36 }}>{preparedTotal}</strong></div></div></aside><article style={{ ...S.tile, ...S.command }}>{current ? <><div><p style={S.kicker}>{current.label}</p><h2 style={S.h2}>{current.title}</h2><p style={S.lead}>{current.detail}</p></div><div style={S.facts}>{(current.facts || []).slice(0, 3).map(([a, b]) => <div key={a} style={S.fact}><span style={{ color: C.muted, fontSize: 12, fontWeight: 900 }}>{a}</span><b style={{ display: "block", marginTop: 6 }}>{b}</b></div>)}</div><button type="button" style={S.action} onClick={() => setModalItem(current)}>Open Work Slip</button></> : <p style={S.lead}>{loading ? "Loading console…" : "No prepared move in this lane."}</p>}</article><aside style={{ ...S.tile, ...S.lanes }}><p style={S.kicker}>Control lanes</p>{[["approve", "Approve", approve.length], ["fix", "Fix", fix.length], ["field", "Field", field.length], ["money", "Money", moneyLane.length]].map(([key, label, count]) => <button key={key} type="button" style={{ ...S.lane, ...(lane === key ? S.laneOn : {}) }} onClick={() => { setLane(key); setSelected(null); }}><span>{label}</span><strong>{count}</strong></button>)}</aside></section><section style={S.lower}><section style={{ ...S.tile, ...S.queue }}><p style={S.kicker}>Prepared queue · {visible.length} items</p><div style={S.rail}>{visible.length ? visible.map((item) => <button key={item.id} type="button" style={{ ...S.card, ...(current?.id === item.id ? S.cardOn : {}) }} onClick={() => setSelected(item)}><span style={S.pill}>{item.cta}</span><h3 style={{ fontSize: 18, lineHeight: 1.1, margin: "10px 0 6px" }}>{item.title}</h3><p style={{ color: C.muted, fontSize: 13, lineHeight: 1.4 }}>{item.detail}</p></button>) : <p style={S.lead}>No work in this lane.</p>}</div></section><aside style={S.timeline}><p style={{ ...S.kicker, color: "#b9f4df" }}>Live process</p>{["Detect work", "Prepare admin", "Owner reviews", "Business moves"].map((step) => <div key={step} style={S.step}><span style={S.dot} /><strong>{step}</strong></div>)}</aside></section></main><WorkSlipModal open={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} onApprove={approveItem} onReject={rejectItem} busy={busy} /></div>;
}
