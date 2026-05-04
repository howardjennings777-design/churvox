import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import "../styles/smartCommandSystem.css";
import "../styles/commandHubReal.css";

const norm = (value) => String(value || "").toLowerCase().trim();
const idOf = (item) => String(item?.id || item?._id || item?.uuid || "");
const listFrom = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of keys) if (Array.isArray(value[key])) return value[key];
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.items)) return value.items;
  return [];
};
const safeGet = async (path) => {
  try { return await get(path); } catch { return []; }
};
const ownerRoles = ["owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"];
const canUseCommand = (role) => ownerRoles.includes(norm(role));
const money = (value) => Number.isFinite(Number(value)) ? `$${Number(value).toFixed(2)}` : "amount unknown";
const todayKey = () => new Date().toISOString().slice(0, 10);
const routeTo = (path) => { window.location.assign(path); };

function clientNameFor(job, clients) {
  const clientId = String(job?.client_id || job?.clientId || job?.customer_id || "");
  const client = clients.find((c) => [c?.id, c?._id, c?.client_id].map(String).includes(clientId));
  return client?.name || client?.business_name || client?.company_name || job?.client_name || job?.customer_name || "Client";
}
function cleanJobTitle(job, clients) {
  const title = String(job?.title || job?.name || job?.service_type || "").trim();
  if (title && !title.match(/^[a-f0-9-]{10,}$/i)) return title;
  return clientNameFor(job, clients) || "Job";
}
function actionPath(action) {
  if (action.job_id) return `/jobs/${action.job_id}`;
  if (action.invoice_id) return `/invoices/${action.invoice_id}`;
  if (action.quote_id) return `/quotes/${action.quote_id}`;
  if (action.client_id) return `/clients/${action.client_id}`;
  return "/dashboard";
}

function buildCommandActions(data, hidden) {
  const actions = [];
  const jobs = data.jobs || [];
  const clients = data.clients || [];
  const invoices = data.invoices || [];
  const quotes = data.quotes || [];
  const proofPacks = data.proofPacks || [];
  const invoiceJobIds = new Set(invoices.map((i) => String(i.job_id || i.jobId || "")).filter(Boolean));

  jobs.forEach((job) => {
    const jobId = idOf(job);
    if (!jobId) return;
    const status = norm(job.status);
    const closed = ["completed", "complete", "cancelled", "canceled", "archived"].includes(status);
    const assigned = job.assigned_worker_id || job.worker_id || job.assigned_worker;
    const label = cleanJobTitle(job, clients);
    const client = clientNameFor(job, clients);

    if (!assigned && !closed) {
      actions.push({ id: `dispatch-${jobId}`, type: "dispatch", priority: "high", title: `Assign crew to ${label}`, summary: `${client} has a job with no worker assigned.`, reason: "Unassigned jobs block the day and stop work moving.", next: "Open the job or Dispatch and assign the right worker.", job_id: jobId, executable: false });
    }

    if (["completed", "complete"].includes(status) && !job.invoice_id && !job.draft_invoice_id && !invoiceJobIds.has(jobId)) {
      const amount = job.fixed_price ?? job.price ?? job.subtotal ?? job.amount;
      const priced = Number.isFinite(Number(amount)) && Number(amount) > 0;
      actions.push({ id: `invoice-${jobId}`, type: priced ? "invoice" : "pricing", priority: priced ? "medium" : "high", title: priced ? `Draft invoice for ${label}` : `Add pricing for ${label}`, summary: priced ? `Suggested amount: ${money(amount)}.` : "Completed job needs a safe price before invoicing.", reason: priced ? "Completed work is ready to become a draft invoice." : "Churvox must not create a $0 invoice.", next: priced ? "Open and create a draft invoice. Do not send or sync MYOB automatically." : "Open the job and add pricing first.", job_id: jobId, executable: false });
      const hasProof = job.proof_pack_id || job.proof_pack_ready || proofPacks.some((p) => String(p.job_id || p.jobId || "") === jobId);
      if (!hasProof) actions.push({ id: `proof-${jobId}`, type: "proof", priority: "medium", title: `Prepare proof pack for ${label}`, summary: "Completed work needs proof before payment follow-up.", reason: "Proof-to-Paid needs customer-ready proof assets.", next: "Prepare a proof pack for owner review.", job_id: jobId, executable: true });
    }
  });

  invoices.forEach((invoice) => {
    const invoiceId = idOf(invoice);
    if (!invoiceId) return;
    const status = norm(invoice.status);
    if (["sent", "open", "overdue", "unpaid", "pending_payment"].includes(status)) {
      actions.push({ id: `invoice-follow-${invoiceId}`, type: "follow", priority: status === "overdue" ? "high" : "medium", title: `Invoice reminder ${invoice.invoice_number || invoice.number || invoiceId.slice(-6)}`, summary: `${money(invoice.balance_due ?? invoice.balance ?? invoice.amount_due ?? invoice.total ?? invoice.amount)} outstanding.`, reason: "Money is waiting to come in.", next: "Prepare or copy a reminder. Do not fake-send messages.", invoice_id: invoiceId, executable: false });
    }
  });

  quotes.forEach((quote) => {
    const quoteId = idOf(quote);
    if (!quoteId) return;
    if (["sent", "pending", "waiting", "viewed", "draft"].includes(norm(quote.status))) {
      actions.push({ id: `quote-follow-${quoteId}`, type: "follow", priority: "medium", title: `Follow up quote ${quote.quote_number || quote.number || quoteId.slice(-6)}`, summary: "Quote is waiting for a customer decision.", reason: "Follow-up can help convert quoted work into booked work.", next: "Prepare or copy a follow-up. Do not auto-send.", quote_id: quoteId, executable: false });
    }
  });

  const simple = [
    [data.receptionist || [], "reception", "Review new enquiry"],
    [data.recurring || [], "recurring", "Recurring work due"],
    [data.customerUpdates || [], "update", "Customer update ready"],
    [data.quoteDrafts || [], "quote_builder", "Quote draft ready"],
    [data.memory || [], "memory", "Client memory suggestion"],
  ];
  simple.forEach(([items, type, fallback]) => items.forEach((item, index) => actions.push({ id: `${type}-${idOf(item) || index}`, type, priority: "medium", title: item.title || item.customer_name || fallback, summary: item.message || item.summary || item.description || item.ai_summary || "Needs review.", reason: "Command found this in your business data.", next: "Open and review safely before anything is sent or changed.", client_id: item.client_id || item.suggested_client_id, job_id: item.job_id, quote_id: item.quote_id, invoice_id: item.invoice_id, executable: false })));

  return actions.filter((a) => !hidden[a.id]);
}

function ActionCard({ action, onDismiss, onProof }) {
  const canPrepareProof = action.type === "proof" && action.executable && action.job_id;
  return <article className="command-action-card">
    <div className="command-card-top"><span className={`command-priority ${action.priority}`}>{action.priority}</span><span>{action.type}</span></div>
    <h3>{action.title}</h3>
    <p>{action.summary}</p>
    <p><b>Why:</b> {action.reason}</p>
    <p><b>Next:</b> {action.next}</p>
    <div className="command-card-actions">
      {canPrepareProof ? <button className="command-btn green" onClick={() => onProof(action)}>Prepare proof</button> : <button className="command-btn dark" onClick={() => routeTo(actionPath(action))}>Review</button>}
      <button className="command-btn light" onClick={() => routeTo(actionPath(action))}>Open</button>
      <button className="command-btn light" onClick={() => onDismiss(action)}>Dismiss</button>
    </div>
  </article>;
}

function WorkspaceButton({ label, to, text }) {
  return <button type="button" className="command-workspace-btn" onClick={() => routeTo(to)}><strong>{label}</strong><span>{text}</span></button>;
}
function ControlCard({ title, count, text, onClick, active }) {
  return <article className={`command-control-card ${active ? "active" : "quiet"}`}><div><h3>{title}</h3><p>{text}</p></div><strong>{count}</strong><button type="button" onClick={onClick}>Open</button></article>;
}

export default function CommandHubRealPage() {
  const { user } = useAuth();
  const [data, setData] = useState({ jobs: [], clients: [], invoices: [], quotes: [], workers: [], proofPacks: [], receptionist: [], recurring: [], customerUpdates: [], quoteDrafts: [], memory: [], health: {} });
  const [hidden, setHidden] = useState({});
  const [tab, setTab] = useState("today");
  const [queueOpen, setQueueOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [jobs, clients, invoices, quotes, workers, proofPacks, receptionist, recurring, customerUpdates, quoteDrafts, memory, health] = await Promise.all([
        safeGet("/jobs"), safeGet("/clients"), safeGet("/invoices"), safeGet("/quotes"), safeGet("/team/workers"), safeGet("/proof-packs"), safeGet("/api/ai/receptionist/enquiries"), safeGet("/api/ai/recurring"), safeGet("/api/ai/customer-updates"), safeGet("/api/ai/quotes/drafts"), safeGet("/api/ai/client-memory"), safeGet("/api/ai/operator/business-health")
      ]);
      setData({ jobs: listFrom(jobs, ["jobs"]), clients: listFrom(clients, ["clients"]), invoices: listFrom(invoices, ["invoices"]), quotes: listFrom(quotes, ["quotes"]), workers: listFrom(workers, ["workers", "items"]), proofPacks: listFrom(proofPacks, ["proof_packs", "items"]), receptionist: listFrom(receptionist, ["enquiries", "items"]), recurring: listFrom(recurring, ["rules", "items"]), customerUpdates: listFrom(customerUpdates, ["updates", "items"]), quoteDrafts: listFrom(quoteDrafts, ["drafts", "items"]), memory: listFrom(memory, ["items", "actions"]), health: health || {} });
    } catch { setError("Command could not load business data yet."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const actions = useMemo(() => buildCommandActions(data, hidden), [data, hidden]);
  const groups = useMemo(() => ({ dispatch: actions.filter(a => a.type === "dispatch"), revenue: actions.filter(a => ["invoice", "pricing"].includes(a.type)), proof: actions.filter(a => a.type === "proof"), follow: actions.filter(a => a.type === "follow"), reception: actions.filter(a => a.type === "reception"), recurring: actions.filter(a => a.type === "recurring"), update: actions.filter(a => a.type === "update"), quote_builder: actions.filter(a => a.type === "quote_builder"), memory: actions.filter(a => a.type === "memory") }), [actions]);
  const activeJobs = data.jobs.filter(j => !["completed", "complete", "cancelled", "canceled", "archived"].includes(norm(j.status)));
  const todayJobs = data.jobs.filter(j => String(j.scheduled_date || j.date || j.start_date || j.due_date || "").startsWith(todayKey())).slice(0, 4);
  const runSheet = todayJobs.length ? todayJobs : activeJobs.slice(0, 4);
  const best = groups.dispatch[0] || groups.revenue[0] || groups.follow[0] || groups.proof[0] || actions[0];
  const selected = tab === "approvals" ? actions : (groups[tab] || []);

  const runAiPlan = async () => { setNotice(""); setError(""); try { await post("/smart-hub/scan", {}); setNotice("AI plan ran. Command refreshed."); await load(); } catch { setError("AI plan could not run yet."); } };
  const prepareProof = async (action) => { try { await post(`/proof-packs/prepare-for-job/${action.job_id}`, {}); setNotice("Proof pack preparation started."); await load(); } catch { setError("Proof pack action could not run yet."); } };

  if (!canUseCommand(user?.role)) return <Layout><main className="smart-command-system"><section className="smart-command-panel"><h2>Command Hub is owner/admin only.</h2></section></main></Layout>;

  const workspaces = [["Jobs", "/jobs", "Create, schedule, assign"], ["Clients", "/clients", "Customers and properties"], ["Quotes", "/quotes", "Prepare and follow up"], ["Invoices", "/invoices", "Drafts and reminders"], ["Team", "/team", "Crew and roles"], ["Dispatch", "/dispatch", "Schedule and allocate"], ["Proof-to-Paid", "/proof-to-paid", "Proof and payment flow"], ["Account & Plan", "/plans", "Billing and limits"], ["Settings", "/settings", "Business setup"]];
  const filters = [["Approvals", "approvals", actions.length], ["Dispatch", "dispatch", groups.dispatch.length], ["Revenue", "revenue", groups.revenue.length], ["Follow-Ups", "follow", groups.follow.length], ["Proof", "proof", groups.proof.length], ["Reception", "reception", groups.reception.length], ["Recurring", "recurring", groups.recurring.length], ["Updates", "update", groups.update.length], ["Quote Builder", "quote_builder", groups.quote_builder.length], ["Client Memory", "memory", groups.memory.length]];

  return <Layout smartHubMode><main className="smart-command-system"><div className="command-real-shell">
    <section className="command-hero"><div><ChurvoxLogo size="hero" /></div><div><p className="smart-command-kicker">Smart Hub</p><h1>Churvox Command Hub</h1><p>Control jobs, clients, quotes, invoices, team, dispatch, Proof-to-Paid, and account operations.</p></div><aside><span>Today</span><strong>Actions to review: {actions.length}</strong><strong>Workers active: {data.workers.length}</strong><div><button onClick={runAiPlan}>Run AI plan</button><button onClick={() => { setQueueOpen(true); setTab("approvals"); }}>Open queue</button></div></aside></section>
    {notice ? <section className="command-notice">{notice}</section> : null}{error ? <section className="command-error">{error}</section> : null}{loading ? <section className="command-notice">Loading Command...</section> : null}
    <section className="command-panel"><p className="smart-command-kicker">Main Hub</p><h2>Run the whole business from here</h2><p>Use these when you know where to go. Use Command when you want AI to guide the next move.</p><div className="command-workspace-grid">{workspaces.map(([label, to, text]) => <WorkspaceButton key={label} label={label} to={to} text={text} />)}</div></section>
    <section className="command-top-grid"><article className="command-panel command-accent"><p className="smart-command-kicker">Business Engine Summary</p><h2>Command found {actions.length} things to handle today.</h2><ul><li>{groups.dispatch.length} jobs need crew</li><li>{groups.revenue.length} revenue items need review</li><li>{groups.follow.length} follow-ups are ready</li><li>{groups.proof.length} proof packs need preparing</li><li>{data.workers.length} workers active</li></ul></article><article className="command-panel"><p className="smart-command-kicker">Best next move</p><h2>{best ? best.title : "Business is clear"}</h2><p>{best ? best.reason : "No urgent Command actions found."}</p><button className="command-btn orange" onClick={() => setTab(best?.type === "dispatch" ? "dispatch" : best?.type === "follow" ? "follow" : best?.type === "proof" ? "proof" : "approvals")}>Open recommended section</button></article></section>
    <section className="command-control-grid"><ControlCard title="Dispatch Command" count={groups.dispatch.length} text="Crew assignment and dispatch balancing." active={groups.dispatch.length > 0} onClick={() => setTab("dispatch")} /><ControlCard title="Revenue Command" count={groups.revenue.length} text="Invoices, pricing, and cashflow follow-through." active={groups.revenue.length > 0} onClick={() => setTab("revenue")} /><ControlCard title="Proof-to-Paid Command" count={groups.proof.length} text="Proof packs required before payment chase." active={groups.proof.length > 0} onClick={() => setTab("proof")} /><ControlCard title="Follow-Up Command" count={groups.follow.length} text="Quote and invoice follow-up preparation." active={groups.follow.length > 0} onClick={() => setTab("follow")} /><ControlCard title="Team/Crew" count={data.workers.length} text="Team capacity and worker availability." active={data.workers.length > 0} onClick={() => routeTo("/team")} /><ControlCard title="Account Health" count={data.health?.warnings?.length || 0} text="Plan, billing, and account risk warnings." active={Boolean(data.health?.warnings?.length)} onClick={() => routeTo("/plans")} /></section>
    <section className="command-panel"><div className="command-section-head"><div><p className="smart-command-kicker">Today’s run sheet</p><h2>Work moving today</h2></div><button className="command-btn light" onClick={() => routeTo("/jobs")}>Open Jobs</button></div>{runSheet.length ? <div className="command-run-list">{runSheet.map(job => <article key={idOf(job)}><b>{cleanJobTitle(job, data.clients)}</b><span>{clientNameFor(job, data.clients)} · {job.status || "open"}</span><button onClick={() => routeTo(`/jobs/${idOf(job)}`)}>Open</button></article>)}</div> : <div className="command-empty"><p>No jobs scheduled for today yet.</p><button onClick={() => routeTo("/jobs/new")}>Create Job</button><button onClick={() => routeTo("/jobs")}>Open Jobs</button></div>}</section>
    <section className="command-panel"><div className="command-section-head"><div><p className="smart-command-kicker">Priority actions</p><h2>Command Work Queue</h2><p>Collapsed by default so the hub stays clean.</p></div><span className="command-pill">{actions.length} ready</span></div><button className="command-btn orange" onClick={() => { setQueueOpen(!queueOpen); setTab("approvals"); }}>{queueOpen ? "Collapse queue" : "Open Command Work Queue"}</button>{queueOpen ? <div className="command-action-list">{actions.slice(0, 5).map(action => <ActionCard key={action.id} action={action} onDismiss={(a) => setHidden(h => ({ ...h, [a.id]: true }))} onProof={prepareProof} />)}</div> : null}</section>
    <section className="command-panel"><p className="smart-command-kicker">Command filters</p><h2>Open a focused view of the work Command found</h2><div className="command-filter-grid">{filters.map(([label, key, count]) => <button key={key} className={count ? "active" : ""} onClick={() => { setTab(key); setQueueOpen(false); }}>{label}<span>{count} items</span></button>)}</div></section>
    {tab !== "today" ? <section className="command-panel"><div className="command-section-head"><h2>{filters.find(f => f[1] === tab)?.[0] || "Approvals"}</h2><button className="command-btn light" onClick={() => setTab("today")}>Close section</button></div>{selected.length ? <div className="command-action-list">{selected.map(action => <ActionCard key={`selected-${action.id}`} action={action} onDismiss={(a) => setHidden(h => ({ ...h, [a.id]: true }))} onProof={prepareProof} />)}</div> : <div className="command-empty"><p>No work in this section right now. Command will surface items here when they appear.</p></div>}</section> : null}
  </div></main></Layout>;
}
