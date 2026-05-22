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

const actionNames = {
  create_invoice_draft: "Invoice draft prepared",
  invoice_draft: "Invoice draft prepared",
  invoice_reminder: "Payment reminder prepared",
  assign_worker: "Worker assignment prepared",
  quote_follow_up: "Quote follow-up prepared",
  today_plan: "Morning office brief prepared",
  payroll_review: "Payroll review prepared",
  missing_price: "Missing price found",
  client_cleanup: "Client record fix prepared",
};

function makeAction(action) {
  const id = idOf(action);
  const reason = action.reason || action.owner_facing_explanation || action.subtitle || action.summary || "Churvox prepared this for owner approval.";
  return {
    id: `action-${id}`,
    action_id: id,
    title: action.title || actionNames[action.action_type] || "Prepared owner decision",
    subtitle: reason,
    reasoning: reason,
    type_label: actionNames[action.action_type] || "Prepared action",
    cta: "Approve",
    source: action.related_type || "AI Operator",
    facts: [
      action.recommendation ? { label: "Recommendation", value: action.recommendation } : null,
      action.generated_message ? { label: "Prepared draft", value: action.generated_message } : null,
      action.related_type ? { label: "Source", value: action.related_type } : null,
    ].filter(Boolean),
  };
}

function makeJob(job, type) {
  const id = idOf(job);
  const client = job.client_name || job.customer_name || "Client";
  const title = job.title || job.job_name || client;
  const address = job.address || job.location || "No address saved";
  const worker = job.assigned_worker_name || job.worker_name || "Unassigned";

  if (type === "invoice") {
    return {
      id: `invoice-job-${id}`,
      title: `Invoice ready · ${title}`,
      subtitle: `${client} · completed work` ,
      reasoning: "This job is complete and no invoice is linked yet. Churvox is keeping completed work from sitting unpaid.",
      type_label: "Money desk",
      cta: "Prepare",
      source: "Completed job",
      facts: [{ label: "Client", value: client }, { label: "Address", value: address }, { label: "Status", value: job.status || "completed" }],
    };
  }

  if (type === "blocker") {
    return {
      id: `blocker-${id}`,
      title: `Worker needed · ${title}`,
      subtitle: `${client} · ${address}`,
      reasoning: "This job has no worker assigned. Churvox surfaced it before it becomes a field problem.",
      type_label: "Needs fixing",
      cta: "Assign",
      source: "Job schedule",
      facts: [{ label: "Client", value: client }, { label: "Worker", value: worker }, { label: "Address", value: address }],
    };
  }

  return {
    id: `field-${id}`,
    title,
    subtitle: `${worker} · ${address}`,
    reasoning: "This job is active or scheduled. Churvox keeps field work visible so owner admin stays connected to what is happening outside.",
    type_label: "Field command",
    cta: "Open",
    source: "Field work",
    facts: [{ label: "Client", value: client }, { label: "Worker", value: worker }, { label: "Status", value: job.status || "scheduled" }],
  };
}

function makeInvoice(invoice) {
  const id = idOf(invoice);
  const total = invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0;
  const customer = invoice.customer_name || invoice.client_name || "Client";
  return {
    id: `invoice-${id}`,
    title: `${customer} · ${cash(total)}`,
    subtitle: `Invoice ${invoice.invoice_number || id.slice(-6)} · ${invoice.status || "open"}`,
    reasoning: "This invoice still needs attention. Churvox keeps money items visible so cashflow is not buried in a list.",
    type_label: "Money desk",
    cta: "Review",
    source: "Invoice",
    facts: [{ label: "Customer", value: customer }, { label: "Amount", value: cash(total) }, { label: "Status", value: invoice.status || "open" }],
  };
}

function Metric({ label, value, note }) {
  return <div className="co-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function CommandItem({ item, active, onClick }) {
  return (
    <button type="button" className={active ? "co-item co-item-active" : "co-item"} onClick={() => onClick(item)}>
      <div><small>{item.type_label}</small><b>{item.title}</b><p>{item.subtitle || item.reasoning}</p></div>
      <em>{item.cta || "Review"}</em>
    </button>
  );
}

function Zone({ title, count, children }) {
  return <section className="co-zone"><header><b>{title}</b><span>{count}</span></header>{children}</section>;
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

  const prepared = useMemo(() => actions.filter((a) => ["pending", "edited", "ready"].includes(String(a.status || "").toLowerCase())).map(makeAction), [actions]);
  const blockers = useMemo(() => jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(String(j.status || "").toLowerCase())).slice(0, 8).map((j) => makeJob(j, "blocker")), [jobs]);
  const field = useMemo(() => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(String(j.status || "").toLowerCase())).slice(0, 8).map((j) => makeJob(j, "field")), [jobs]);
  const money = useMemo(() => {
    const readyJobs = jobs.filter((j) => ["completed", "done", "complete"].includes(String(j.status || "").toLowerCase()) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)).slice(0, 5).map((j) => makeJob(j, "invoice"));
    const openInvoices = invoices.filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending"].includes(String(i.status || "").toLowerCase())).slice(0, 6).map(makeInvoice);
    return [...readyJobs, ...openInvoices];
  }, [jobs, invoices]);

  const commandStack = useMemo(() => {
    const stack = [...prepared, ...blockers, ...money, ...field];
    return stack.length ? stack : [];
  }, [prepared, blockers, money, field]);

  const current = selected || commandStack[0] || null;
  const urgent = snapshot?.urgent || {};

  const runScan = async () => {
    setScanning(true);
    const res = await post("/smart-hub/scan", {});
    setScanning(false);
    if (res.success) { toast.success("Command Office scan complete"); load(); }
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
    <div className="co-page" data-testid="command-office-page">
      <header className="co-topbar">
        <Link to="/" className="co-logo"><ChurvoxLogo /></Link>
        <nav><Link to="/jobs">Jobs</Link><Link to="/clients">Clients</Link><Link to="/quotes">Quotes</Link><Link to="/invoices">Invoices</Link><Link to="/team">Team</Link><Link to="/payroll">Payroll</Link></nav>
        <button type="button" className="co-scan" onClick={runScan} disabled={scanning}>{scanning ? "Scanning…" : "Run command scan"}</button>
        <button type="button" className="co-avatar" onClick={signOut}>{(user?.name || user?.email || "U").slice(0,1).toUpperCase()}</button>
      </header>

      <main className="co-main">
        <section className="co-hero">
          <div className="co-brief">
            <p className="co-kicker">Command Office</p>
            <h1>Churvox runs the admin. You approve the moves.</h1>
            <p>{snapshot?.next_best_move || "Invoices, quotes, workers, job blockers and money are checked here so the owner does not have to chase everything manually."}</p>
          </div>
          <div className="co-metrics">
            <Metric label="Ready to approve" value={snapshot?.approvals?.total_pending ?? prepared.length} note="prepared moves" />
            <Metric label="Needs fixing" value={blockers.length} note="blocked work" />
            <Metric label="Field live" value={urgent.active_jobs || field.length} note="jobs moving" />
            <Metric label="Money desk" value={money.length} note="cashflow items" />
          </div>
        </section>

        <section className="co-command-grid">
          <div className="co-stack">
            <div className="co-stack-head"><span>AI Command Stack</span><h2>Prepared moves</h2><p>{loading ? "Loading business command centre…" : "These are the actions Churvox has prepared or surfaced for the owner."}</p></div>
            <div className="co-list">
              {commandStack.length ? commandStack.slice(0, 12).map((item) => <CommandItem key={item.id} item={item} active={current?.id === item.id} onClick={setSelected} />) : <p className="co-empty">No prepared moves waiting. Run a command scan when new work comes in.</p>}
            </div>
          </div>

          <aside className="co-reason">
            <p className="co-kicker">Why Churvox surfaced this</p>
            {current ? <><h2>{current.title}</h2><p>{current.reasoning}</p><div className="co-facts">{(current.facts || []).slice(0, 5).map((fact, index) => <div key={index}><span>{fact.label}</span><b>{fact.value}</b></div>)}</div><button type="button" onClick={() => setModalItem(current)}>Open Work Slip</button><small>Approval-first: customer messages, pricing, payroll and accounting moves stay under owner control.</small></> : <p>No command selected.</p>}
          </aside>

          <div className="co-zones">
            <Zone title="Needs fixing" count={blockers.length}>{blockers.length ? blockers.slice(0, 3).map((item) => <CommandItem key={item.id} item={item} onClick={setSelected} />) : <p className="co-empty">No blockers found.</p>}</Zone>
            <Zone title="Field command" count={field.length}>{field.length ? field.slice(0, 3).map((item) => <CommandItem key={item.id} item={item} onClick={setSelected} />) : <p className="co-empty">No active field work.</p>}</Zone>
            <Zone title="Money desk" count={money.length}>{money.length ? money.slice(0, 3).map((item) => <CommandItem key={item.id} item={item} onClick={setSelected} />) : <p className="co-empty">Money desk clear.</p>}</Zone>
          </div>
        </section>
      </main>

      <WorkSlipModal open={!!modalItem} onClose={() => setModalItem(null)} item={modalItem} onApprove={approveItem} onReject={rejectItem} busy={busy} />

      <style>{`
        .co-page{min-height:100vh;background:#e8e2d6;color:#101114;font-family:Inter,system-ui,sans-serif}.co-topbar{position:sticky;top:0;z-index:50;height:76px;background:#101114;color:#fbf8f1;display:flex;align-items:center;gap:18px;padding:0 clamp(14px,3vw,46px);box-shadow:0 18px 50px rgba(16,17,20,.24);border-bottom:1px solid #272b32}.co-logo{display:flex;filter:invert(1) grayscale(1) brightness(2)}.co-topbar nav{display:flex;gap:4px;flex:1}.co-topbar nav a{color:rgba(251,248,241,.72);text-decoration:none;font-weight:850;font-size:13px;padding:10px 12px;border-radius:8px}.co-topbar nav a:hover{background:#242830;color:#fff}.co-scan,.co-avatar{border:0;border-radius:9px;font-weight:900;background:#fbf8f1;color:#101114;padding:11px 15px;cursor:pointer}.co-scan:disabled{opacity:.65}.co-avatar{width:42px;height:42px;padding:0;background:#242830;color:#fbf8f1}.co-main{padding:28px clamp(14px,3vw,46px) 54px}.co-hero{display:grid;grid-template-columns:minmax(0,1.28fr) minmax(420px,.86fr);gap:22px;align-items:stretch}.co-brief{background:#fbf8f1;border:1px solid #cdc3b3;border-radius:16px;padding:clamp(28px,4vw,44px);box-shadow:0 24px 70px rgba(16,17,20,.12)}.co-kicker{text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:950;color:#9b8059;margin:0 0 13px}.co-brief h1{font-family:Outfit,Inter,sans-serif;font-size:clamp(46px,6.8vw,96px);line-height:.86;letter-spacing:-.08em;margin:0;color:#101114;max-width:1050px}.co-brief p{max-width:820px;font-size:18px;line-height:1.56;color:#5f6670}.co-metrics{display:grid;grid-template-columns:1fr 1fr;gap:12px}.co-metric{background:#101114;color:#fbf8f1;border:1px solid #272b32;border-radius:14px;box-shadow:0 24px 70px rgba(16,17,20,.22);padding:20px;min-height:132px;display:flex;flex-direction:column;justify-content:space-between}.co-metric span{text-transform:uppercase;letter-spacing:.11em;font-size:11px;font-weight:950;color:rgba(251,248,241,.62)}.co-metric strong{font-family:Outfit,Inter,sans-serif;font-size:40px;line-height:1;color:#fbf8f1}.co-metric small{color:#caa46d;font-weight:800}.co-command-grid{margin-top:22px;display:grid;grid-template-columns:minmax(520px,1.2fr) minmax(380px,.8fr);grid-template-areas:'stack reason' 'stack zones';gap:18px}.co-stack{grid-area:stack;background:#fbf8f1;border:1px solid #a89b88;border-radius:16px;box-shadow:0 38px 110px rgba(16,17,20,.17);padding:20px;min-height:680px}.co-stack-head{border-bottom:1px solid #cdc3b3;padding-bottom:18px;margin-bottom:16px}.co-stack-head span{font-size:12px;text-transform:uppercase;letter-spacing:.14em;font-weight:950;color:#c58a2b}.co-stack-head h2{font-family:Outfit,Inter,sans-serif;font-size:clamp(36px,4.6vw,64px);line-height:.9;letter-spacing:-.07em;margin:8px 0;color:#101114}.co-stack-head p{margin:0;color:#5f6670;line-height:1.45}.co-list{display:grid;gap:10px}.co-item{width:100%;border:1px solid #cdc3b3;background:#fff;text-align:left;border-radius:11px;padding:15px;display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}.co-item:hover{transform:translateY(-1px);border-color:#a89b88;box-shadow:0 14px 34px rgba(16,17,20,.08)}.co-item-active{border-color:#101114;box-shadow:inset 4px 0 0 #c58a2b,0 14px 34px rgba(16,17,20,.08)}.co-item small{display:block;text-transform:uppercase;letter-spacing:.1em;font-size:10px;font-weight:950;color:#9b8059;margin-bottom:5px}.co-item b{display:block;color:#101114;font-size:15px}.co-item p{margin:4px 0 0;color:#5f6670;font-size:13px;line-height:1.35}.co-item em{font-style:normal;background:#101114;color:#fbf8f1;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;white-space:nowrap}.co-reason{grid-area:reason;background:#101114;color:#fbf8f1;border:1px solid #272b32;border-radius:16px;box-shadow:0 34px 100px rgba(16,17,20,.26);padding:24px;min-height:360px}.co-reason .co-kicker{color:#caa46d}.co-reason h2{font-family:Outfit,Inter,sans-serif;font-size:clamp(30px,3.8vw,52px);line-height:.95;letter-spacing:-.06em;margin:0 0 12px;color:#fbf8f1}.co-reason p{color:rgba(251,248,241,.72);line-height:1.52}.co-reason button{width:100%;border:0;border-radius:9px;background:#fbf8f1;color:#101114;padding:13px 15px;font-weight:950;margin-top:16px}.co-reason small{display:block;color:rgba(251,248,241,.52);line-height:1.45;margin-top:14px}.co-facts{display:grid;gap:8px;margin-top:16px}.co-facts div{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(251,248,241,.13);padding-bottom:8px}.co-facts span{color:rgba(251,248,241,.55)}.co-facts b{color:#fbf8f1;text-align:right}.co-zones{grid-area:zones;display:grid;gap:14px}.co-zone{background:#fff;border:1px solid #cdc3b3;border-radius:14px;box-shadow:0 14px 42px rgba(16,17,20,.09);padding:14px}.co-zone header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.co-zone header b{font-size:14px}.co-zone header span{background:#101114;color:#fbf8f1;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:950}.co-zone .co-item{box-shadow:none;padding:12px}.co-zone .co-item + .co-item{margin-top:8px}.co-empty{color:#5f6670;margin:0;padding:15px}@media(max-width:1120px){.co-hero,.co-command-grid{grid-template-columns:1fr;grid-template-areas:none}.co-stack,.co-reason,.co-zones{grid-area:auto}.co-topbar nav{display:none}}@media(max-width:650px){.co-topbar{height:64px;padding:0 12px}.co-scan{padding:10px 12px}.co-main{padding:16px 12px 34px}.co-brief{padding:24px}.co-brief h1{font-size:42px}.co-metrics{grid-template-columns:1fr 1fr}.co-metric{min-height:104px;padding:14px}.co-metric strong{font-size:28px}.co-stack{min-height:unset;padding:14px}.co-item{align-items:flex-start;flex-direction:column}.co-item em{align-self:flex-start}.co-stack-head h2{font-size:34px}}
      `}</style>
    </div>
  );
}
