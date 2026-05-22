import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import WorkSlipModal from "../components/frontdesk/WorkSlipModal";

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.actions)) return value.actions;
  return [];
};

const idOf = (item) => String(item?.id || item?._id || "");
const cash = (value) => `$${Number(value || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const names = {
  create_invoice_draft: "Invoice prepared",
  invoice_draft: "Invoice prepared",
  invoice_reminder: "Reminder prepared",
  assign_worker: "Worker move prepared",
  quote_follow_up: "Follow-up prepared",
  today_plan: "Office brief ready",
  payroll_review: "Payroll review ready",
  missing_price: "Price fix needed",
  client_cleanup: "Client fix prepared",
};

function aiAction(action) {
  const id = idOf(action);
  const reason = action.reason || action.owner_facing_explanation || action.subtitle || "Churvox prepared this move for owner approval.";
  return {
    id: `ai-${id}`,
    action_id: id,
    lane: "approve",
    type_label: names[action.action_type] || "Prepared move",
    title: action.title || names[action.action_type] || "Prepared move",
    subtitle: reason,
    reasoning: reason,
    cta: "Approve",
    facts: [
      action.recommendation ? { label: "Recommendation", value: action.recommendation } : null,
      action.generated_message ? { label: "Draft", value: action.generated_message } : null,
      action.related_type ? { label: "Source", value: action.related_type } : null,
    ].filter(Boolean),
  };
}

function jobMove(job, lane) {
  const id = idOf(job);
  const client = job.client_name || job.customer_name || "Client";
  const title = job.title || job.job_name || client;
  const address = job.address || job.location || "No address saved";
  const worker = job.assigned_worker_name || job.worker_name || "Unassigned";

  if (lane === "money") {
    return {
      id: `job-money-${id}`,
      lane,
      type_label: "Invoice opportunity",
      title: `Invoice ready · ${title}`,
      subtitle: `${client} · completed work`,
      reasoning: "The job is completed and no invoice is linked. Churvox is stopping completed work from sitting unpaid.",
      cta: "Prepare",
      facts: [{ label: "Client", value: client }, { label: "Address", value: address }, { label: "Status", value: job.status || "completed" }],
    };
  }

  if (lane === "fix") {
    return {
      id: `job-fix-${id}`,
      lane,
      type_label: "Blocker",
      title: `Worker needed · ${title}`,
      subtitle: `${client} · ${address}`,
      reasoning: "This job has no worker assigned. Churvox surfaced it before the field team gets stuck.",
      cta: "Assign",
      facts: [{ label: "Client", value: client }, { label: "Worker", value: worker }, { label: "Address", value: address }],
    };
  }

  return {
    id: `job-field-${id}`,
    lane: "field",
    type_label: "Field work",
    title,
    subtitle: `${worker} · ${address}`,
    reasoning: "This work is active or scheduled. Churvox keeps field movement visible without opening every job on the dashboard.",
    cta: "Open",
    facts: [{ label: "Client", value: client }, { label: "Worker", value: worker }, { label: "Status", value: job.status || "scheduled" }],
  };
}

function invoiceMove(invoice) {
  const id = idOf(invoice);
  const total = invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0;
  const customer = invoice.customer_name || invoice.client_name || "Client";
  return {
    id: `invoice-${id}`,
    lane: "money",
    type_label: "Money desk",
    title: `${customer} · ${cash(total)}`,
    subtitle: `Invoice ${invoice.invoice_number || id.slice(-6)} · ${invoice.status || "open"}`,
    reasoning: "This invoice still needs attention. Churvox keeps cashflow items in one money lane instead of opening everything on the dashboard.",
    cta: "Review",
    facts: [{ label: "Customer", value: customer }, { label: "Amount", value: cash(total) }, { label: "Status", value: invoice.status || "open" }],
  };
}

function Metric({ label, value, note }) {
  return <div className="machine-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function Move({ item, active, onClick }) {
  return (
    <button type="button" className={active ? "machine-item active" : "machine-item"} onClick={() => onClick(item)}>
      <div><small>{item.type_label}</small><b>{item.title}</b><p>{item.subtitle}</p></div>
      <em>{item.cta}</em>
    </button>
  );
}

export default function CommandOfficePage() {
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
    if (actionRes.success) setActions(safeArray(actionRes.data));
    if (jobRes.success) setJobs(safeArray(jobRes.data));
    if (invoiceRes.success) setInvoices(safeArray(invoiceRes.data));
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const approve = useMemo(() => actions.filter((a) => ["pending", "edited", "ready"].includes(String(a.status || "").toLowerCase())).map(aiAction), [actions]);
  const fix = useMemo(() => jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(String(j.status || "").toLowerCase())).slice(0, 12).map((j) => jobMove(j, "fix")), [jobs]);
  const field = useMemo(() => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(String(j.status || "").toLowerCase())).slice(0, 12).map((j) => jobMove(j, "field")), [jobs]);
  const money = useMemo(() => {
    const readyJobs = jobs.filter((j) => ["completed", "done", "complete"].includes(String(j.status || "").toLowerCase()) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)).slice(0, 8).map((j) => jobMove(j, "money"));
    const openInvoices = invoices.filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending"].includes(String(i.status || "").toLowerCase())).slice(0, 8).map(invoiceMove);
    return [...readyJobs, ...openInvoices];
  }, [jobs, invoices]);

  const lanes = { approve, fix, field, money };
  const visible = lanes[lane] || [];
  const current = selected && selected.lane === lane ? selected : visible[0] || null;
  const urgent = snapshot?.urgent || {};

  const runScan = async () => {
    setScanning(true);
    const res = await post("/smart-hub/scan", {});
    setScanning(false);
    if (res.success) { toast.success("Machine scan complete"); load(); }
    else toast.error(res.error || "Scan failed");
  };

  const approveItem = async (item) => {
    if (!item?.action_id) return;
    setBusy(true);
    const res = await post(`/ai-operator/actions/${item.action_id}/approve`, {});
    setBusy(false);
    if (res.success) { toast.success("Move approved"); setModalItem(null); setSelected(null); load(); }
    else toast.error(res.error || "Could not approve");
  };

  const rejectItem = async (item) => {
    if (!item?.action_id) return;
    setBusy(true);
    const res = await post(`/ai-operator/actions/${item.action_id}/reject`, {});
    setBusy(false);
    if (res.success) { toast.success("Move dismissed"); setModalItem(null); setSelected(null); load(); }
    else toast.error(res.error || "Could not dismiss");
  };

  const signOut = async () => { await logout(); navigate("/login", { replace: true }); };

  return (
    <div className="machine-page" data-testid="command-machine-page">
      <header className="machine-top">
        <Link to="/" className="machine-logo"><ChurvoxLogo /></Link>
        <nav><Link to="/jobs">Jobs</Link><Link to="/clients">Clients</Link><Link to="/quotes">Quotes</Link><Link to="/invoices">Invoices</Link><Link to="/team">Team</Link><Link to="/payroll">Payroll</Link></nav>
        <button type="button" className="machine-scan" onClick={runScan} disabled={scanning}>{scanning ? "Scanning…" : "Run machine"}</button>
        <button type="button" className="machine-user" onClick={signOut}>{(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}</button>
      </header>

      <main className="machine-main">
        <section className="machine-hero">
          <div className="machine-title">
            <p className="machine-kicker">Command Machine</p>
            <h1>Churvox prepares the work. You approve the move.</h1>
            <p>{snapshot?.next_best_move || "This is not an open dashboard. It is a control machine: choose one lane, inspect one prepared move, approve only what matters."}</p>
          </div>
          <div className="machine-metrics">
            <Metric label="Approve" value={approve.length} note="prepared moves" />
            <Metric label="Fix" value={fix.length} note="blocked jobs" />
            <Metric label="Field" value={urgent.active_jobs || field.length} note="moving work" />
            <Metric label="Money" value={money.length} note="cashflow items" />
          </div>
        </section>

        <section className="machine-grid">
          <div className="machine-queue">
            <div className="machine-head">
              <div><p className="machine-kicker">One lane open</p><h2>{lane === "approve" ? "Ready to approve" : lane === "fix" ? "Needs fixing" : lane === "field" ? "Field command" : "Money desk"}</h2><p>{loading ? "Loading machine…" : "Only one lane is open at a time. No wall of noisy cards."}</p></div>
              <div className="machine-tabs">
                {[ ["approve", "Approve", approve.length], ["fix", "Fix", fix.length], ["field", "Field", field.length], ["money", "Money", money.length] ].map(([key, label, count]) => <button key={key} type="button" className={lane === key ? "active" : ""} onClick={() => { setLane(key); setSelected(null); }}>{label} · {count}</button>)}
              </div>
            </div>
            <div className="machine-list">
              {visible.length ? visible.map((item) => <Move key={item.id} item={item} active={current?.id === item.id} onClick={setSelected} />) : <p>No work in this lane right now.</p>}
            </div>
          </div>

          <aside className="machine-side">
            <div className="machine-slip">
              <p className="machine-kicker">Decision slip</p>
              {current ? <><h2>{current.title}</h2><p>{current.reasoning}</p><div className="machine-facts">{(current.facts || []).slice(0, 5).map((fact, index) => <div key={index}><span>{fact.label}</span><b>{fact.value}</b></div>)}</div><button type="button" onClick={() => setModalItem(current)}>Open Work Slip</button></> : <p>No move selected.</p>}
            </div>
            <div className="machine-zones">
              <section className="machine-zone"><header><b>What Churvox is doing</b><span>AI prep</span></header><p>Checking work, surfacing blockers, lining up admin and keeping the owner in control.</p></section>
              <section className="machine-zone"><header><b>What stays locked</b><span>Approval</span></header><p>Customer messages, prices, payroll and accounting moves do not leave without owner approval.</p></section>
            </div>
          </aside>
        </section>
      </main>

      <WorkSlipModal open={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} onApprove={approveItem} onReject={rejectItem} busy={busy} />
    </div>
  );
}
