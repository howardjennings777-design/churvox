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

const actionLabel = {
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

function fromAction(action) {
  const id = rowId(action);
  const reason = action.reason || action.owner_facing_explanation || action.subtitle || action.summary || "Churvox prepared this for owner approval.";
  return {
    id: `a-${id}`,
    action_id: id,
    lane: "approve",
    label: actionLabel[action.action_type] || "Prepared move",
    title: action.title || actionLabel[action.action_type] || "Prepared owner move",
    detail: reason,
    cta: "Approve",
    facts: [
      action.recommendation ? ["Recommendation", action.recommendation] : null,
      action.generated_message ? ["Draft", action.generated_message] : null,
      action.related_type ? ["Source", action.related_type] : null,
    ].filter(Boolean),
  };
}

function fromJob(job, lane) {
  const id = rowId(job);
  const client = job.client_name || job.customer_name || "Client";
  const title = job.title || job.job_name || client;
  const worker = job.assigned_worker_name || job.worker_name || "Unassigned";
  const address = job.address || job.location || "No address saved";
  if (lane === "money") {
    return { id: `jm-${id}`, lane, label: "Invoice opportunity", title: `Prepare invoice · ${title}`, detail: "Completed work has no linked invoice. Churvox pulled it into the money lane.", cta: "Prepare", facts: [["Client", client], ["Address", address], ["Status", job.status || "complete"]] };
  }
  if (lane === "fix") {
    return { id: `jf-${id}`, lane, label: "Blocked job", title: `Assign crew · ${title}`, detail: "No worker is assigned. Churvox surfaced it before the job stalls.", cta: "Assign", facts: [["Client", client], ["Worker", worker], ["Address", address]] };
  }
  return { id: `j-${id}`, lane: "field", label: "Field movement", title, detail: "This work is moving in the field. Churvox keeps it visible without opening every job card.", cta: "Open", facts: [["Client", client], ["Worker", worker], ["Status", job.status || "scheduled"]] };
}

function fromInvoice(invoice) {
  const id = rowId(invoice);
  const customer = invoice.customer_name || invoice.client_name || "Client";
  const total = invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0;
  return { id: `i-${id}`, lane: "money", label: "Money item", title: `${customer} · ${money(total)}`, detail: "This invoice needs attention. Churvox keeps cashflow decisions visible.", cta: "Review", facts: [["Customer", customer], ["Amount", money(total)], ["Status", invoice.status || "open"]] };
}

const S = {
  page: { minHeight: "100vh", background: "radial-gradient(circle at 88% 8%, rgba(0,167,255,.24), transparent 32%), linear-gradient(135deg,#edf5ff,#ffffff 54%,#dceeff)", color: "#142033", fontFamily: "Inter, system-ui, sans-serif" },
  top: { minHeight: 76, display: "flex", alignItems: "center", gap: 18, padding: "0 clamp(14px,3vw,44px)", background: "linear-gradient(90deg,#1d2d4a,#2764ff)", boxShadow: "0 18px 48px rgba(39,100,255,.24)", position: "sticky", top: 0, zIndex: 20 },
  logo: { display: "flex", textDecoration: "none" },
  nav: { display: "flex", gap: 4, flex: 1 },
  navA: { color: "rgba(255,255,255,.84)", textDecoration: "none", fontWeight: 850, fontSize: 13, padding: "10px 12px", borderRadius: 12 },
  run: { border: 0, borderRadius: 14, background: "#fff", color: "#1d2d4a", padding: "12px 15px", fontWeight: 950, boxShadow: "0 14px 34px rgba(20,32,51,.14)" },
  main: { padding: "clamp(18px,3vw,34px) clamp(14px,3vw,44px) 56px" },
  hero: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 420px", gap: 18, alignItems: "stretch" },
  heroCard: { background: "rgba(255,255,255,.94)", border: "1px solid #c9d8ef", borderRadius: 32, padding: "clamp(28px,4vw,48px)", boxShadow: "0 28px 90px rgba(35,58,102,.16)", backdropFilter: "blur(14px)" },
  kicker: { margin: 0, color: "#2764ff", textTransform: "uppercase", letterSpacing: ".17em", fontSize: 11, fontWeight: 950 },
  h1: { margin: "12px 0", fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(48px,7vw,108px)", lineHeight: .8, letterSpacing: "-.09em", color: "#142033" },
  lead: { color: "#61708a", fontSize: 18, lineHeight: 1.55, maxWidth: 820 },
  radar: { background: "linear-gradient(160deg,#1d2d4a,#2764ff)", borderRadius: 32, padding: 22, color: "#fff", boxShadow: "0 28px 90px rgba(39,100,255,.28)", display: "grid", gap: 12 },
  metric: { background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 22, padding: 18 },
  metricValue: { fontFamily: "Outfit, Inter, sans-serif", fontSize: 44, lineHeight: .9, display: "block" },
  workspace: { display: "grid", gridTemplateColumns: "260px minmax(0,1fr) 400px", gap: 18, marginTop: 18 },
  lanes: { background: "rgba(255,255,255,.92)", border: "1px solid #c9d8ef", borderRadius: 28, padding: 16, boxShadow: "0 22px 70px rgba(35,58,102,.13)" },
  lane: { width: "100%", border: "1px solid #c9d8ef", background: "#fff", color: "#142033", borderRadius: 18, padding: "15px 14px", marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, fontWeight: 950, cursor: "pointer" },
  laneOn: { background: "linear-gradient(135deg,#2764ff,#00a7ff)", color: "#fff", borderColor: "#8ed7ff", boxShadow: "0 16px 38px rgba(39,100,255,.22)" },
  feed: { background: "rgba(255,255,255,.94)", border: "1px solid #c9d8ef", borderRadius: 28, padding: 18, boxShadow: "0 22px 70px rgba(35,58,102,.13)" },
  feedHead: { display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-end", borderBottom: "1px solid #dbe7f7", paddingBottom: 14, marginBottom: 10 },
  h2: { margin: 0, fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(34px,4.4vw,62px)", lineHeight: .86, letterSpacing: "-.075em", color: "#142033" },
  item: { width: "100%", textAlign: "left", background: "#fff", border: "1px solid #c9d8ef", borderRadius: 20, padding: 17, marginTop: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, cursor: "pointer" },
  itemOn: { borderColor: "#2764ff", boxShadow: "inset 5px 0 0 #00a7ff, 0 16px 42px rgba(39,100,255,.14)" },
  pill: { alignSelf: "start", background: "#eef5ff", color: "#1d2d4a", borderRadius: 999, padding: "8px 10px", fontSize: 12, fontWeight: 950 },
  slip: { background: "linear-gradient(180deg,#ffffff,#f7fbff)", border: "1px solid #c9d8ef", borderRadius: 28, padding: 24, boxShadow: "0 22px 70px rgba(35,58,102,.13)", position: "sticky", top: 96, alignSelf: "start" },
  fact: { display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #dbe7f7", padding: "10px 0", color: "#61708a" },
  open: { width: "100%", border: 0, borderRadius: 16, background: "linear-gradient(135deg,#2764ff,#00a7ff)", color: "#fff", padding: "14px 16px", fontWeight: 950, marginTop: 18, boxShadow: "0 18px 42px rgba(39,100,255,.28)" },
};

function Metric({ label, value }) {
  return <div style={S.metric}><span style={{ color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: ".12em", fontSize: 11, fontWeight: 900 }}>{label}</span><strong style={S.metricValue}>{value}</strong></div>;
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
    const [snap, actionRes, jobRes, invoiceRes] = await Promise.all([
      get("/ai-operator/command-snapshot"),
      get("/ai-operator/actions"),
      get("/jobs"),
      get("/invoices"),
    ]);
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

  const runScan = async () => {
    setScanning(true);
    const res = await post("/smart-hub/scan", {});
    setScanning(false);
    if (res.success) { toast.success("TechFlow scan complete"); load(); }
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

  return (
    <div style={S.page}>
      <header style={S.top}>
        <Link to="/" style={S.logo}><ChurvoxLogo /></Link>
        <nav style={S.nav}>{["jobs", "clients", "quotes", "invoices", "team", "payroll"].map((x) => <Link key={x} to={`/${x}`} style={S.navA}>{x[0].toUpperCase() + x.slice(1)}</Link>)}</nav>
        <button type="button" style={S.run} onClick={runScan} disabled={scanning}>{scanning ? "Scanning…" : "Run TechFlow"}</button>
        <button type="button" style={S.run} onClick={async () => { await logout(); navigate("/login", { replace: true }); }}>{(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}</button>
      </header>

      <main style={S.main}>
        <section style={S.hero}>
          <div style={S.heroCard}>
            <p style={S.kicker}>TechFlow Desk</p>
            <h1 style={S.h1}>Churvox prepared the next move.</h1>
            <p style={S.lead}>{snapshot?.next_best_move || "Pick one live lane, inspect the decision slip, and approve only the work that matters. The admin is prepared before you start chasing."}</p>
          </div>
          <aside style={S.radar}>
            <Metric label="Approve" value={approve.length} />
            <Metric label="Fix" value={fix.length} />
            <Metric label="Field" value={field.length} />
            <Metric label="Money" value={moneyLane.length} />
          </aside>
        </section>

        <section style={S.workspace}>
          <aside style={S.lanes}>
            <p style={S.kicker}>Live lanes</p>
            {[ ["approve", "Ready to approve", approve.length], ["fix", "Needs fixing", fix.length], ["field", "Field flow", field.length], ["money", "Money flow", moneyLane.length] ].map(([key, title, count]) => <button key={key} type="button" style={{ ...S.lane, ...(lane === key ? S.laneOn : {}) }} onClick={() => { setLane(key); setSelected(null); }}>{title}<b>{count}</b></button>)}
          </aside>

          <section style={S.feed}>
            <div style={S.feedHead}><div><p style={S.kicker}>Selected lane only</p><h2 style={S.h2}>{lane === "approve" ? "Ready to approve" : lane === "fix" ? "Needs fixing" : lane === "field" ? "Field flow" : "Money flow"}</h2></div><span style={S.pill}>{visible.length} items</span></div>
            {loading ? <p style={{ color: "#61708a" }}>Loading TechFlow…</p> : visible.length ? visible.map((item) => <button key={item.id} type="button" style={{ ...S.item, ...(current?.id === item.id ? S.itemOn : {}) }} onClick={() => setSelected(item)}><div><small style={S.kicker}>{item.label}</small><b>{item.title}</b><p style={{ color: "#61708a", lineHeight: 1.45 }}>{item.detail}</p></div><em style={S.pill}>{item.cta}</em></button>) : <p style={{ color: "#61708a" }}>No prepared work in this lane.</p>}
          </section>

          <aside style={S.slip}>
            <p style={S.kicker}>Decision slip</p>
            {current ? <><h2 style={S.h2}>{current.title}</h2><p style={{ color: "#61708a", lineHeight: 1.55 }}>{current.detail}</p>{(current.facts || []).map(([a, b]) => <div key={a} style={S.fact}><span>{a}</span><b style={{ color: "#142033", textAlign: "right" }}>{b}</b></div>)}<button type="button" style={S.open} onClick={() => setModalItem(current)}>Open Work Slip</button></> : <p style={{ color: "#61708a" }}>No decision selected.</p>}
          </aside>
        </section>
      </main>

      <WorkSlipModal open={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} onApprove={approveItem} onReject={rejectItem} busy={busy} />
    </div>
  );
}
