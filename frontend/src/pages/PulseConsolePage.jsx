import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import WorkSlipModal from "../components/frontdesk/WorkSlipModal";

const list = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.actions) ? v.actions : [];
const idOf = (x) => String(x?.id || x?._id || "");
const dollars = (n) => `$${Number(n || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const actionName = {
  create_invoice_draft: "Invoice prepared",
  invoice_draft: "Invoice prepared",
  invoice_reminder: "Payment follow-up",
  assign_worker: "Crew move",
  quote_follow_up: "Quote follow-up",
  today_plan: "Daily plan",
  payroll_review: "Payroll review",
  missing_price: "Price gap",
  client_cleanup: "Client fix",
};

function actionMove(action) {
  const id = idOf(action);
  const detail = action.reason || action.owner_facing_explanation || action.subtitle || action.summary || "Churvox prepared this for owner approval.";
  return {
    id: `a-${id}`,
    action_id: id,
    lane: "approve",
    label: actionName[action.action_type] || "Prepared move",
    title: action.title || actionName[action.action_type] || "Prepared owner move",
    detail,
    cta: "Approve",
    facts: [
      action.recommendation ? ["Recommendation", action.recommendation] : null,
      action.generated_message ? ["Draft", action.generated_message] : null,
      action.related_type ? ["Source", action.related_type] : null,
    ].filter(Boolean),
  };
}

function jobMove(job, lane) {
  const id = idOf(job);
  const client = job.client_name || job.customer_name || "Client";
  const title = job.title || job.job_name || client;
  const worker = job.assigned_worker_name || job.worker_name || "Unassigned";
  const address = job.address || job.location || "No address saved";
  if (lane === "money") return { id: `jm-${id}`, lane, label: "Invoice opportunity", title: `Invoice · ${title}`, detail: "Completed work has no linked invoice. Churvox pulled it into the money lane.", cta: "Prepare", facts: [["Client", client], ["Address", address], ["Status", job.status || "complete"]] };
  if (lane === "fix") return { id: `jf-${id}`, lane, label: "Blocked job", title: `Assign crew · ${title}`, detail: "No worker is assigned. Churvox surfaced it before the job stalls.", cta: "Assign", facts: [["Client", client], ["Worker", worker], ["Address", address]] };
  return { id: `j-${id}`, lane: "field", label: "Field movement", title, detail: "This work is moving in the field. Churvox keeps it visible without opening every job card.", cta: "Open", facts: [["Client", client], ["Worker", worker], ["Status", job.status || "scheduled"]] };
}

function invoiceMove(invoice) {
  const id = idOf(invoice);
  const customer = invoice.customer_name || invoice.client_name || "Client";
  const total = invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0;
  return { id: `i-${id}`, lane: "money", label: "Money item", title: `${customer} · ${dollars(total)}`, detail: "This invoice needs attention. Churvox keeps cashflow decisions visible.", cta: "Review", facts: [["Customer", customer], ["Amount", dollars(total)], ["Status", invoice.status || "open"]] };
}

const C = {
  ink: "#2d3238",
  graphite: "#3c424a",
  paper: "#fffaf2",
  cloud: "#f4efe7",
  titanium: "#dfe3e6",
  line: "#d0c7ba",
  coral: "#ff6b35",
  magenta: "#b8336a",
  amber: "#f4a62a",
  muted: "#706b63",
};

const S = {
  page: { minHeight: "100vh", background: `radial-gradient(circle at 18% 12%, rgba(255,107,53,.22), transparent 30%), radial-gradient(circle at 82% 6%, rgba(184,51,106,.18), transparent 28%), linear-gradient(135deg, ${C.cloud}, #ffffff 52%, #ebe1d2)`, color: C.ink, fontFamily: "Inter, system-ui, sans-serif" },
  top: { minHeight: 70, display: "flex", alignItems: "center", gap: 16, padding: "0 clamp(14px,3vw,40px)", background: "rgba(255,250,242,.88)", borderBottom: `1px solid ${C.line}`, boxShadow: "0 16px 42px rgba(45,50,56,.12)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 20 },
  logo: { display: "flex", textDecoration: "none" },
  nav: { display: "flex", gap: 4, flex: 1 },
  navA: { color: C.graphite, textDecoration: "none", fontWeight: 850, fontSize: 13, padding: "9px 10px", borderRadius: 12 },
  run: { border: 0, borderRadius: 14, background: C.ink, color: C.paper, padding: "11px 15px", fontWeight: 950, boxShadow: "0 14px 34px rgba(45,50,56,.18)" },
  avatar: { border: 0, borderRadius: 14, background: `linear-gradient(135deg, ${C.coral}, ${C.magenta})`, color: "#fff", padding: "11px 15px", fontWeight: 950 },
  main: { padding: "clamp(16px,2.8vw,32px) clamp(14px,3vw,42px) 48px" },
  stage: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 18, alignItems: "stretch" },
  titleCard: { background: "rgba(255,250,242,.94)", border: `1px solid ${C.line}`, borderRadius: 32, padding: "clamp(22px,3.5vw,38px)", boxShadow: "0 28px 78px rgba(45,50,56,.14)", backdropFilter: "blur(14px)", position: "relative", overflow: "hidden" },
  kicker: { margin: 0, color: C.coral, textTransform: "uppercase", letterSpacing: ".15em", fontSize: 10, fontWeight: 950 },
  h1: { margin: "10px 0", fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(36px,5vw,76px)", lineHeight: .88, letterSpacing: "-.065em", color: C.ink },
  lead: { color: C.muted, fontSize: 16, lineHeight: 1.5, maxWidth: 860 },
  pulse: { background: `linear-gradient(160deg, ${C.ink}, ${C.graphite})`, borderRadius: 32, padding: 22, color: C.paper, boxShadow: "0 26px 80px rgba(45,50,56,.24)", display: "grid", placeItems: "center", textAlign: "center" },
  pulseRing: { width: 188, height: 188, borderRadius: "50%", border: `14px solid rgba(255,255,255,.14)`, outline: `2px solid ${C.coral}`, display: "grid", placeItems: "center", background: `radial-gradient(circle, rgba(255,107,53,.32), transparent 64%)` },
  laneOrbit: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 18 },
  lane: { border: `1px solid ${C.line}`, background: "rgba(255,250,242,.92)", color: C.ink, borderRadius: 22, padding: 16, textAlign: "left", cursor: "pointer", boxShadow: "0 14px 34px rgba(45,50,56,.09)" },
  laneOn: { background: `linear-gradient(135deg, ${C.coral}, ${C.magenta})`, color: "#fff", borderColor: "transparent", boxShadow: "0 18px 46px rgba(255,107,53,.24)" },
  core: { marginTop: 18, display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(280px,.75fr)", gap: 18 },
  decision: { background: "rgba(255,250,242,.96)", border: `1px solid ${C.line}`, borderRadius: 34, padding: "clamp(22px,3.5vw,38px)", boxShadow: "0 26px 82px rgba(45,50,56,.15)" },
  h2: { margin: 0, fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(28px,3.8vw,54px)", lineHeight: .93, letterSpacing: "-.055em", color: C.ink },
  facts: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 18 },
  fact: { background: "#f6eee3", border: `1px solid ${C.line}`, borderRadius: 18, padding: 14 },
  open: { border: 0, borderRadius: 16, background: `linear-gradient(135deg, ${C.coral}, ${C.magenta})`, color: "#fff", padding: "13px 17px", fontWeight: 950, marginTop: 20, boxShadow: "0 16px 38px rgba(184,51,106,.22)" },
  timeline: { background: `linear-gradient(180deg, ${C.ink}, ${C.graphite})`, borderRadius: 34, padding: 22, color: C.paper, boxShadow: "0 26px 82px rgba(45,50,56,.2)" },
  step: { display: "grid", gridTemplateColumns: "34px 1fr", gap: 12, alignItems: "start", marginBottom: 18 },
  dot: { width: 28, height: 28, borderRadius: "50%", background: C.coral, boxShadow: "0 0 0 8px rgba(255,107,53,.16)" },
  conveyor: { marginTop: 18, background: "rgba(255,250,242,.92)", border: `1px solid ${C.line}`, borderRadius: 30, padding: 16, boxShadow: "0 18px 58px rgba(45,50,56,.1)" },
  rail: { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 },
  card: { minWidth: 245, textAlign: "left", border: `1px solid ${C.line}`, background: "#fffaf2", borderRadius: 20, padding: 16, cursor: "pointer" },
  cardOn: { borderColor: C.coral, boxShadow: `inset 0 -4px 0 ${C.coral}, 0 14px 32px rgba(255,107,53,.14)` },
  pill: { display: "inline-flex", background: "#f7e4d9", color: C.ink, borderRadius: 999, padding: "7px 9px", fontSize: 11, fontWeight: 950 },
};

function Orbit({ label, value }) {
  return <div><span style={{ color: "rgba(255,250,242,.7)", textTransform: "uppercase", letterSpacing: ".12em", fontSize: 10, fontWeight: 900 }}>{label}</span><strong style={{ display: "block", fontFamily: "Outfit, Inter, sans-serif", fontSize: 32, lineHeight: .95 }}>{value}</strong></div>;
}

export default function PulseConsolePage() {
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
    if (actionRes.success) setActions(list(actionRes.data));
    if (jobRes.success) setJobs(list(jobRes.data));
    if (invoiceRes.success) setInvoices(list(invoiceRes.data));
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const approve = useMemo(() => actions.filter((a) => ["pending", "edited", "ready"].includes(String(a.status || "").toLowerCase())).map(actionMove), [actions]);
  const fix = useMemo(() => jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(String(j.status || "").toLowerCase())).slice(0, 12).map((j) => jobMove(j, "fix")), [jobs]);
  const field = useMemo(() => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(String(j.status || "").toLowerCase())).slice(0, 12).map((j) => jobMove(j, "field")), [jobs]);
  const moneyLane = useMemo(() => {
    const readyJobs = jobs.filter((j) => ["completed", "done", "complete"].includes(String(j.status || "").toLowerCase()) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)).slice(0, 8).map((j) => jobMove(j, "money"));
    const openInvoices = invoices.filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending"].includes(String(i.status || "").toLowerCase())).slice(0, 8).map(invoiceMove);
    return [...readyJobs, ...openInvoices];
  }, [jobs, invoices]);

  const lanes = { approve, fix, field, money: moneyLane };
  const visible = lanes[lane] || [];
  const current = selected && selected.lane === lane ? selected : visible[0] || null;
  const laneData = [["approve", "Approve", approve.length], ["fix", "Fix", fix.length], ["field", "Field", field.length], ["money", "Money", moneyLane.length]];

  const runScan = async () => {
    setScanning(true);
    const res = await post("/smart-hub/scan", {});
    setScanning(false);
    if (res.success) { toast.success("Pulse scan complete"); load(); }
    else toast.error(res.error || "Scan failed");
  };

  const approveItem = async (item) => {
    if (!item?.action_id) return;
    setBusy(true);
    const res = await post(`/ai-operator/actions/${item.action_id}/approve`, {});
    setBusy(false);
    if (res.success) { toast.success("Approved"); setModalItem(null); load(); }
    else toast.error(res.error || "Could not approve");
  };

  const rejectItem = async (item) => {
    if (!item?.action_id) return;
    setBusy(true);
    const res = await post(`/ai-operator/actions/${item.action_id}/reject`, {});
    setBusy(false);
    if (res.success) { toast.success("Dismissed"); setModalItem(null); load(); }
    else toast.error(res.error || "Could not dismiss");
  };

  return <div style={S.page}>
    <header style={S.top}>
      <Link to="/" style={S.logo}><ChurvoxLogo /></Link>
      <nav style={S.nav}>{["jobs", "clients", "quotes", "invoices", "team", "payroll"].map((x) => <Link key={x} to={`/${x}`} style={S.navA}>{x[0].toUpperCase() + x.slice(1)}</Link>)}</nav>
      <button type="button" style={S.run} onClick={runScan} disabled={scanning}>{scanning ? "Scanning…" : "Run Pulse"}</button>
      <button type="button" style={S.avatar} onClick={async () => { await logout(); navigate("/login", { replace: true }); }}>{(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}</button>
    </header>

    <main style={S.main}>
      <section style={S.stage}>
        <div style={S.titleCard}>
          <p style={S.kicker}>Pulse Console</p>
          <h1 style={S.h1}>The next admin move is ready.</h1>
          <p style={S.lead}>{snapshot?.next_best_move || "Churvox checks the business, prepares the admin, then gives the owner one clean decision to act on."}</p>
        </div>
        <aside style={S.pulse}>
          <div style={S.pulseRing}><Orbit label="Prepared" value={approve.length + fix.length + field.length + moneyLane.length} /></div>
        </aside>
      </section>

      <section style={S.laneOrbit}>{laneData.map(([key, label, count]) => <button key={key} type="button" style={{ ...S.lane, ...(lane === key ? S.laneOn : {}) }} onClick={() => { setLane(key); setSelected(null); }}><span style={{ fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".12em" }}>{label}</span><strong style={{ display: "block", fontFamily: "Outfit, Inter, sans-serif", fontSize: 30 }}>{count}</strong></button>)}</section>

      <section style={S.core}>
        <article style={S.decision}>
          {current ? <><p style={S.kicker}>{current.label}</p><h2 style={S.h2}>{current.title}</h2><p style={S.lead}>{current.detail}</p><div style={S.facts}>{(current.facts || []).slice(0, 3).map(([a, b]) => <div key={a} style={S.fact}><span style={{ color: C.muted, fontSize: 12, fontWeight: 900 }}>{a}</span><b style={{ display: "block", marginTop: 6 }}>{b}</b></div>)}</div><button type="button" style={S.open} onClick={() => setModalItem(current)}>Open Work Slip</button></> : <p style={S.lead}>{loading ? "Loading Pulse…" : "No prepared move in this lane."}</p>}
        </article>

        <aside style={S.timeline}>
          <p style={{ ...S.kicker, color: "#ffd4c1" }}>What happens</p>
          {["Churvox detects the work", "Admin is prepared", "Owner reviews one slip", "Approved move updates the business"].map((step) => <div key={step} style={S.step}><span style={S.dot} /><strong>{step}</strong></div>)}
        </aside>
      </section>

      <section style={S.conveyor}>
        <p style={S.kicker}>Prepared queue · {visible.length} items</p>
        <div style={S.rail}>{visible.length ? visible.map((item) => <button key={item.id} type="button" style={{ ...S.card, ...(current?.id === item.id ? S.cardOn : {}) }} onClick={() => setSelected(item)}><span style={S.pill}>{item.cta}</span><h3 style={{ fontSize: 18, lineHeight: 1.1, margin: "10px 0 6px" }}>{item.title}</h3><p style={{ color: C.muted, fontSize: 13, lineHeight: 1.4 }}>{item.detail}</p></button>) : <p style={S.lead}>No work in this lane.</p>}</div>
      </section>
    </main>

    <WorkSlipModal open={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} onApprove={approveItem} onReject={rejectItem} busy={busy} />
  </div>;
}
