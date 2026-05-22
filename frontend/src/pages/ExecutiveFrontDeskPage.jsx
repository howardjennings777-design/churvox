import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import WorkSlipModal from "../components/frontdesk/WorkSlipModal";
import OnboardingChecklist from "../components/frontdesk/OnboardingChecklist";

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.actions)) return value.actions;
  return [];
};

const money = (value) => `$${Number(value || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const idOf = (item) => String(item?.id || item?._id || "");

const actionLabels = {
  create_invoice_draft: "Invoice draft prepared",
  invoice_draft: "Invoice draft prepared",
  invoice_reminder: "Invoice reminder prepared",
  assign_worker: "Worker move prepared",
  quote_follow_up: "Quote follow-up prepared",
  today_plan: "Office brief prepared",
  payroll_review: "Payroll review prepared",
  missing_price: "Missing price found",
  client_cleanup: "Client cleanup prepared",
};

function actionItem(action) {
  const id = idOf(action);
  const reason = action.reason || action.owner_facing_explanation || action.subtitle || "Churvox prepared this office action for owner approval.";
  return {
    id,
    action_id: id,
    title: action.title || actionLabels[action.action_type] || "Prepared office action",
    subtitle: reason,
    summary: action.what_happens || reason,
    reasoning: reason,
    type_label: actionLabels[action.action_type] || String(action.action_type || "prepared action").replace(/_/g, " "),
    cta: "Approve",
    facts: [
      action.recommendation ? { label: "Recommendation", value: action.recommendation } : null,
      action.generated_message ? { label: "Prepared draft", value: action.generated_message } : null,
      action.related_type ? { label: "Source", value: String(action.related_type) } : null,
    ].filter(Boolean),
    related: action.related_id ? { type: String(action.related_type || ""), id: String(action.related_id) } : null,
  };
}

function jobItem(job, kind) {
  const id = idOf(job);
  const client = job.client_name || job.customer_name || "Client";
  const address = job.address || job.location || "Address not saved";

  if (kind === "ready-invoice") {
    return {
      id: `invoice-${id}`,
      title: `Invoice can be prepared · ${job.title || client}`,
      subtitle: `${client} · completed job`,
      summary: "Completed job waiting for invoice preparation.",
      reasoning: "The job is complete and no invoice is linked yet. Churvox surfaces it so completed work does not sit unpaid.",
      type_label: "Money desk",
      cta: "Prepare invoice",
      facts: [{ label: "Client", value: client }, { label: "Address", value: address }],
      related: { type: "job", id },
    };
  }

  if (kind === "field") {
    return {
      id: `field-${id}`,
      title: job.title || client,
      subtitle: `${job.assigned_worker_name || "Worker not assigned"} · ${address}`,
      summary: `Status: ${job.status || "scheduled"}`,
      reasoning: "This work is active or scheduled. Churvox keeps it visible so field work and owner admin stay connected.",
      type_label: "Field work",
      cta: "Open",
      facts: [{ label: "Worker", value: job.assigned_worker_name || "Unassigned" }, { label: "Client", value: client }, { label: "Address", value: address }],
      related: { type: "job", id },
    };
  }

  return {
    id: `fix-${id}`,
    title: `Worker needed · ${job.title || client}`,
    subtitle: `${client} · ${address}`,
    summary: "This job has no worker assigned.",
    reasoning: "Churvox found a job without a saved worker before it becomes a field problem.",
    type_label: "Blocker",
    cta: "Assign",
    facts: [{ label: "Client", value: client }, { label: "Address", value: address }, { label: "Status", value: job.status || "—" }],
    related: { type: "job", id },
  };
}

function invoiceItem(invoice) {
  const id = idOf(invoice);
  const total = invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0;
  return {
    id: `money-${id}`,
    title: `${invoice.customer_name || invoice.client_name || "Client"} · ${money(total)}`,
    subtitle: `Invoice ${invoice.invoice_number || id.slice(-6)} · ${invoice.status || "open"}`,
    summary: "Invoice needs owner attention.",
    reasoning: "Churvox keeps open, draft, unpaid and overdue invoices in the money desk so cashflow is not buried.",
    type_label: "Invoice",
    cta: "Review",
    facts: [{ label: "Customer", value: invoice.customer_name || invoice.client_name || "—" }, { label: "Amount", value: money(total) }, { label: "Status", value: invoice.status || "—" }],
    related: { type: "invoice", id },
  };
}

function Stat({ label, value }) {
  return <div className="office-stat"><small>{label}</small><strong>{value}</strong></div>;
}

function WorkRow({ item, onClick, primary }) {
  return (
    <button type="button" className={primary ? "office-row office-row-primary" : "office-row"} onClick={() => onClick(item)}>
      <div><b>{item.title}</b><p>{item.subtitle || item.summary}</p></div>
      <em>{item.cta || "Review"}</em>
    </button>
  );
}

function DeskRail({ title, items, empty, onClick }) {
  return (
    <section className="office-rail-card">
      <header><b>{title}</b><span>{items.length}</span></header>
      <div>{items.length ? items.slice(0, 4).map((item) => <WorkRow key={item.id} item={item} onClick={onClick} />) : <p className="office-empty">{empty}</p>}</div>
    </section>
  );
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

  const prepared = useMemo(() => actions.filter((a) => ["pending", "edited"].includes(String(a.status || "").toLowerCase())).map(actionItem), [actions]);
  const blockers = useMemo(() => jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(String(j.status || "").toLowerCase())).slice(0, 8).map((j) => jobItem(j, "fix")), [jobs]);
  const field = useMemo(() => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(String(j.status || "").toLowerCase())).slice(0, 8).map((j) => jobItem(j, "field")), [jobs]);
  const moneyItems = useMemo(() => {
    const ready = jobs.filter((j) => ["completed", "done", "complete"].includes(String(j.status || "").toLowerCase()) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)).slice(0, 5).map((j) => jobItem(j, "ready-invoice"));
    const openInvoices = invoices.filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending"].includes(String(i.status || "").toLowerCase())).slice(0, 6).map(invoiceItem);
    return [...ready, ...openInvoices];
  }, [jobs, invoices]);

  const runScan = async () => {
    setScanning(true);
    const res = await post("/smart-hub/scan", {});
    setScanning(false);
    if (res.success) { toast.success("Office scan complete"); load(); }
    else toast.error(res.error || "Scan failed");
  };

  const approveItem = async (item) => {
    if (!item?.action_id) return;
    setBusy(true);
    const res = await post(`/ai-operator/actions/${item.action_id}/approve`, {});
    setBusy(false);
    if (res.success) { toast.success("Approved"); setOpenItem(null); load(); }
    else toast.error(res.error || "Could not approve");
  };

  const rejectItem = async (item) => {
    if (!item?.action_id) return;
    setBusy(true);
    const res = await post(`/ai-operator/actions/${item.action_id}/reject`, {});
    setBusy(false);
    if (res.success) { toast.success("Dismissed"); setOpenItem(null); load(); }
    else toast.error(res.error || "Could not reject");
  };

  const signOut = async () => { await logout(); navigate("/login", { replace: true }); };

  const urgent = snapshot?.urgent || {};
  const queue = prepared.length ? prepared : [...blockers, ...moneyItems, ...field].slice(0, 10);
  const selected = openItem || queue[0] || null;

  return (
    <div className="office-desk" data-testid="front-desk-page">
      <header className="office-top">
        <Link to="/" className="office-logo"><ChurvoxLogo /></Link>
        <nav><Link to="/jobs">Jobs</Link><Link to="/clients">Clients</Link><Link to="/quotes">Quotes</Link><Link to="/invoices">Invoices</Link><Link to="/team">Team</Link><Link to="/payroll">Payroll</Link></nav>
        <button onClick={runScan} disabled={scanning}>{scanning ? "Checking…" : "Scan office"}</button>
        <button className="office-user" onClick={signOut}>{(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}</button>
      </header>

      <main className="office-main">
        <section className="office-brief">
          <div>
            <p className="office-kicker">Office Desk</p>
            <h1>Churvox prepares the admin. You approve the moves.</h1>
            <p>{snapshot?.next_best_move || "Jobs, invoices, quotes, workers and blockers are checked here so the owner does not have to chase everything manually."}</p>
          </div>
          <div className="office-stats">
            <Stat label="Prepared" value={snapshot?.approvals?.total_pending ?? prepared.length} />
            <Stat label="Field" value={urgent.active_jobs || field.length} />
            <Stat label="Blockers" value={blockers.length} />
            <Stat label="Money" value={moneyItems.length} />
          </div>
        </section>

        <OnboardingChecklist />

        <section className="office-workbench">
          <div className="office-queue">
            <div className="office-title"><span>Prepared</span><div><h2>For approval</h2><p>{loading ? "Loading the office desk…" : "The admin Churvox has prepared or surfaced for the owner."}</p></div></div>
            <div className="office-list">{queue.length ? queue.map((item, idx) => <WorkRow key={item.id} item={item} onClick={setOpenItem} primary={idx === 0} />) : <p className="office-empty">No prepared work waiting. Run an office scan when new work comes in.</p>}</div>
          </div>

          <aside className="office-reasoning">
            <p className="office-kicker">Churvox reasoning</p>
            {selected ? <><h2>{selected.title}</h2><p>{selected.reasoning || selected.summary}</p><div className="office-facts">{(selected.facts || []).slice(0, 4).map((fact, i) => <div key={i}><span>{fact.label}</span><b>{fact.value}</b></div>)}</div><button onClick={() => setOpenItem(selected)}>Open Work Slip</button></> : <p>No item selected.</p>}
            <small>Churvox prepares. Owner approves. Nothing important leaves without you.</small>
          </aside>

          <div className="office-rails">
            <DeskRail title="Blockers" items={blockers} empty="No blockers found" onClick={setOpenItem} />
            <DeskRail title="Field" items={field} empty="No active field work" onClick={setOpenItem} />
            <DeskRail title="Money" items={moneyItems} empty="Money desk clear" onClick={setOpenItem} />
          </div>
        </section>
      </main>

      <WorkSlipModal open={!!openItem} onClose={() => setOpenItem(null)} item={openItem} onApprove={approveItem} onReject={rejectItem} busy={busy} />

      <style>{`
        .office-desk{min-height:100vh;background:#e8e2d6;color:#101114;font-family:Inter,system-ui,sans-serif}.office-top{position:sticky;top:0;z-index:40;height:74px;background:#101114;color:#fbf8f1;display:flex;align-items:center;gap:20px;padding:0 clamp(16px,3vw,46px);box-shadow:0 18px 50px rgba(16,17,20,.20)}.office-logo{display:flex;align-items:center;text-decoration:none;filter:invert(1) grayscale(1) brightness(2)}.office-top nav{display:flex;gap:4px;flex:1}.office-top nav a{color:rgba(251,248,241,.72);text-decoration:none;font-weight:800;font-size:13px;padding:10px 12px;border-radius:8px}.office-top nav a:hover{background:#242830;color:#fff}.office-top button{border:0;border-radius:9px;font-weight:900;padding:11px 16px;background:#fbf8f1;color:#101114;cursor:pointer}.office-user{width:42px!important;height:42px!important;padding:0!important;background:#242830!important;color:#fbf8f1!important}.office-main{padding:28px clamp(16px,3vw,46px) 46px}.office-brief{display:grid;grid-template-columns:minmax(0,1.34fr) minmax(420px,.82fr);gap:22px;align-items:stretch}.office-brief>div:first-child{background:#fbf8f1;border:1px solid #cdc3b3;padding:34px;border-radius:14px;box-shadow:0 20px 60px rgba(16,17,20,.10)}.office-kicker{text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:900;color:#9b8059;margin:0 0 12px}.office-brief h1{font-family:Outfit,Inter,sans-serif;font-size:clamp(44px,6vw,82px);line-height:.92;letter-spacing:-.065em;margin:0;color:#101114;max-width:980px}.office-brief p{max-width:760px;font-size:17px;line-height:1.55;color:#5f6670}.office-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px}.office-stat{background:#101114;color:#fbf8f1;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:8px;min-height:122px;box-shadow:0 20px 60px rgba(16,17,20,.16);border:1px solid #272b32}.office-stat small{text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:rgba(251,248,241,.62);font-weight:900}.office-stat strong{font-family:Outfit,Inter,sans-serif;font-size:34px;line-height:1}.office-workbench{margin-top:22px;display:grid;grid-template-columns:minmax(480px,1.2fr) minmax(360px,.72fr);grid-template-areas:'queue reasoning' 'queue rails';gap:18px}.office-queue{grid-area:queue;background:#fbf8f1;border:1px solid #a89b88;border-radius:14px;box-shadow:0 34px 90px rgba(16,17,20,.15);padding:20px;min-height:620px}.office-title{display:flex;gap:18px;border-bottom:1px solid #cdc3b3;padding-bottom:18px;margin-bottom:16px}.office-title span{font-family:Outfit,Inter,sans-serif;font-size:17px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#9b8059}.office-title h2{margin:0;font-family:Outfit,Inter,sans-serif;font-size:42px;letter-spacing:-.055em;line-height:.95}.office-title p{margin:4px 0 0;color:#5f6670}.office-list{display:grid;gap:10px}.office-row{width:100%;border:1px solid #cdc3b3;background:#fff;text-align:left;border-radius:10px;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer}.office-row-primary{border-color:#101114;box-shadow:inset 4px 0 0 #c58a2b}.office-row b{display:block;font-size:15px;color:#101114}.office-row p{margin:4px 0 0;color:#5f6670;font-size:13px;line-height:1.35}.office-row em{font-style:normal;font-size:12px;font-weight:900;background:#101114;color:#fbf8f1;border-radius:999px;padding:7px 10px;white-space:nowrap}.office-reasoning{grid-area:reasoning;background:#101114;color:#fbf8f1;border:1px solid #272b32;border-radius:14px;padding:24px;box-shadow:0 28px 80px rgba(16,17,20,.20);min-height:330px}.office-reasoning h2{font-family:Outfit,Inter,sans-serif;font-size:32px;line-height:1;letter-spacing:-.04em;margin:0 0 12px;color:#fbf8f1}.office-reasoning p{color:rgba(251,248,241,.72);line-height:1.5}.office-reasoning button{width:100%;border:0;border-radius:9px;padding:13px 16px;background:#fbf8f1;color:#101114;font-weight:900;margin-top:16px}.office-reasoning small{display:block;margin-top:14px;color:rgba(251,248,241,.52)}.office-facts{display:grid;gap:8px;margin-top:16px}.office-facts div{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(251,248,241,.14);padding-bottom:8px}.office-facts span{color:rgba(251,248,241,.55)}.office-facts b{color:#fbf8f1;text-align:right}.office-rails{grid-area:rails;display:grid;gap:14px}.office-rail-card{background:#fff;border:1px solid #cdc3b3;border-radius:12px;padding:14px;box-shadow:0 14px 40px rgba(16,17,20,.08)}.office-rail-card header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.office-rail-card header b{font-size:14px}.office-rail-card header span{background:#f3eee5;border-radius:999px;padding:4px 8px;font-size:12px;font-weight:900}.office-empty{color:#5f6670;margin:0;padding:16px}@media(max-width:1120px){.office-brief,.office-workbench{grid-template-columns:1fr;grid-template-areas:none}.office-queue,.office-reasoning,.office-rails{grid-area:auto}.office-top nav{display:none}}@media(max-width:620px){.office-main{padding:16px 12px 32px}.office-brief h1{font-size:42px}.office-stats{grid-template-columns:1fr 1fr}.office-stat{min-height:94px;padding:14px}.office-stat strong{font-size:26px}.office-queue{min-height:unset;padding:14px}.office-row{align-items:flex-start;flex-direction:column}.office-top{height:64px;padding:0 12px}.office-top button{padding:10px 12px}.office-title{display:block}.office-title h2{font-size:32px;margin-top:8px}}
      `}</style>
    </div>
  );
}
