import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import "../styles/smartCommandSystem.css";
import "../styles/commandHubReal.css";

const norm = (value) => String(value || "").toLowerCase().trim();
const idOf = (item) => String(item?.id || item?._id || item?.uuid || "");
const safeDateKey = () => new Date().toISOString().slice(0, 10);
const money = (value) => Number.isFinite(Number(value)) ? `$${Number(value).toFixed(2)}` : "amount unknown";
const ownerRoles = ["owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"];
const canUseCommand = (role) => ownerRoles.includes(norm(role));
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
const routeTo = (path) => window.location.assign(path);

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
function isClosedJob(job) {
  return ["completed", "complete", "cancelled", "canceled", "archived"].includes(norm(job.status));
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
    const assigned = job.assigned_worker_id || job.worker_id || job.assigned_worker;
    const label = cleanJobTitle(job, clients);
    const client = clientNameFor(job, clients);

    if (!assigned && !isClosedJob(job)) {
      actions.push({
        id: `dispatch-${jobId}`, type: "dispatch", priority: "high", executable: true,
        title: `Assign crew to ${label}`,
        summary: `${client} has a job with no worker assigned.`,
        reason: "Unassigned jobs block the day and stop work moving.",
        next: "Command can assign the first safe worker, or you can review the job first.", job_id: jobId,
      });
    }

    if (["completed", "complete"].includes(status) && !job.invoice_id && !job.draft_invoice_id && !invoiceJobIds.has(jobId)) {
      const amount = job.fixed_price ?? job.price ?? job.subtotal ?? job.amount;
      const priced = Number.isFinite(Number(amount)) && Number(amount) > 0;
      actions.push({
        id: `invoice-${jobId}`, type: priced ? "invoice" : "pricing", priority: priced ? "medium" : "high", executable: priced,
        title: priced ? `Create draft invoice for ${label}` : `Add pricing for ${label}`,
        summary: priced ? `Suggested amount: ${money(amount)}.` : "Completed job needs a safe price before invoicing.",
        reason: priced ? "Completed work is ready to become a draft invoice." : "Churvox must not create a $0 invoice.",
        next: priced ? "Create draft invoice only. No sending, charging, or MYOB sync." : "Open the job and add pricing first.", job_id: jobId,
      });
      const hasProof = job.proof_pack_id || job.proof_pack_ready || proofPacks.some((p) => String(p.job_id || p.jobId || "") === jobId);
      if (!hasProof) {
        actions.push({
          id: `proof-${jobId}`, type: "proof", priority: "medium", executable: true,
          title: `Prepare proof pack for ${label}`,
          summary: "Completed work needs proof before payment follow-up.",
          reason: "Proof-to-Paid needs customer-ready proof assets.",
          next: "Prepare a proof pack for owner review.", job_id: jobId,
        });
      }
    }
  });

  invoices.forEach((invoice) => {
    const invoiceId = idOf(invoice);
    if (!invoiceId) return;
    const status = norm(invoice.status);
    if (["sent", "open", "overdue", "unpaid", "pending_payment"].includes(status)) {
      actions.push({
        id: `invoice-follow-${invoiceId}`, type: "follow", priority: status === "overdue" ? "high" : "medium", executable: true,
        title: `Prepare reminder for invoice ${invoice.invoice_number || invoice.number || invoiceId.slice(-6)}`,
        summary: `${money(invoice.balance_due ?? invoice.balance ?? invoice.amount_due ?? invoice.total ?? invoice.amount)} outstanding.`,
        reason: "Money is waiting to come in.",
        next: "Prepare a reminder draft only. Nothing is sent automatically.", invoice_id: invoiceId,
      });
    }
  });

  quotes.forEach((quote) => {
    const quoteId = idOf(quote);
    if (!quoteId) return;
    if (["sent", "pending", "waiting", "viewed", "draft"].includes(norm(quote.status))) {
      actions.push({
        id: `quote-follow-${quoteId}`, type: "follow", priority: "medium", executable: true,
        title: `Prepare quote follow-up ${quote.quote_number || quote.number || quoteId.slice(-6)}`,
        summary: "Quote is waiting for a customer decision.",
        reason: "Follow-up can help convert quoted work into booked work.",
        next: "Prepare a follow-up draft only. Nothing is sent automatically.", quote_id: quoteId,
      });
    }
  });

  const simple = [
    [data.receptionist || [], "reception", "Review new enquiry"],
    [data.recurring || [], "recurring", "Recurring work due"],
    [data.customerUpdates || [], "update", "Customer update ready"],
    [data.quoteDrafts || [], "quote_builder", "Quote draft ready"],
    [data.memory || [], "memory", "Client memory suggestion"],
  ];
  simple.forEach(([items, type, fallback]) => items.forEach((item, index) => actions.push({
    id: `${type}-${idOf(item) || index}`, type, priority: "medium", executable: false,
    title: item.title || item.customer_name || fallback,
    summary: item.message || item.summary || item.description || item.ai_summary || "Needs review.",
    reason: "Command found this in your business data.",
    next: "Open and review safely before anything is sent or changed.",
    client_id: item.client_id || item.suggested_client_id, job_id: item.job_id, quote_id: item.quote_id, invoice_id: item.invoice_id,
  })));

  const unique = new Map();
  actions.forEach((action) => { if (action.id && !hidden[action.id] && !unique.has(action.id)) unique.set(action.id, action); });
  return Array.from(unique.values());
}

function actionButtonLabel(action) {
  if (action.type === "dispatch") return "Assign";
  if (action.type === "invoice") return "Create draft";
  if (action.type === "proof") return "Prepare proof";
  if (action.type === "follow") return "Prepare follow-up";
  return "Review";
}
function ActionCard({ action, onDismiss, onExecute, compact = false }) {
  const canExecute = ["dispatch", "invoice", "proof", "follow"].includes(action.type) && action.executable;
  return <article className={`command-action-card ${compact ? "compact" : ""}`}>
    <div className="command-card-top"><span className={`command-priority ${action.priority}`}>{action.priority}</span><span>{action.type}</span>{canExecute ? <span className="ready">ready</span> : <span>review</span>}</div>
    <h3>{action.title}</h3>
    <p>{action.summary}</p>
    {!compact && <><p><b>Why AI picked this:</b> {action.reason}</p><p><b>What happens next:</b> {action.next}</p></>}
    <div className="command-card-actions">
      {canExecute ? <button className="command-btn green" onClick={() => onExecute(action)}>{actionButtonLabel(action)}</button> : <button className="command-btn dark" onClick={() => routeTo(actionPath(action))}>Review</button>}
      <button className="command-btn light" onClick={() => routeTo(actionPath(action))}>Open full</button>
      <button className="command-btn ghost" onClick={() => onDismiss(action)}>Dismiss</button>
    </div>
  </article>;
}

function Metric({ label, value, text }) {
  return <div className="command-mini-metric"><strong>{value}</strong><span>{label}</span><small>{text}</small></div>;
}
function NextMove({ title, count, text, onClick, tone = "orange" }) {
  return <button className={`command-next-move ${tone}`} onClick={onClick}>
    <span>{title}</span><strong>{count}</strong><small>{text}</small>
  </button>;
}
function WorkspaceButton({ label, text, onClick }) {
  return <button type="button" className="command-workspace-btn" onClick={onClick}><strong>{label}</strong><span>{text}</span></button>;
}
function ControlCard({ title, count, text, onClick, active }) {
  return <article className={`command-control-card ${active ? "active" : "quiet"}`}><div><h3>{title}</h3><p>{text}</p></div><strong>{count}</strong><button type="button" onClick={onClick}>Open inside hub</button></article>;
}
function Drawer({ drawer, onClose, children }) {
  if (!drawer) return null;
  return <div className="command-drawer-backdrop" onClick={onClose}>
    <aside className="command-drawer" onClick={(e) => e.stopPropagation()}>
      <div className="command-drawer-head"><div><p className="smart-command-kicker">Command drawer</p><h2>{drawer.title}</h2>{drawer.subtitle ? <p>{drawer.subtitle}</p> : null}</div><button onClick={onClose}>Close</button></div>
      {children}
    </aside>
  </div>;
}

export default function CommandHubRealPage() {
  const { user } = useAuth();
  const [data, setData] = useState({ jobs: [], clients: [], invoices: [], quotes: [], workers: [], proofPacks: [], receptionist: [], recurring: [], customerUpdates: [], quoteDrafts: [], memory: [], health: {} });
  const [hidden, setHidden] = useState({});
  const [drawer, setDrawer] = useState(null);
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
  const groups = useMemo(() => ({
    dispatch: actions.filter(a => a.type === "dispatch"),
    revenue: actions.filter(a => ["invoice", "pricing"].includes(a.type)),
    proof: actions.filter(a => a.type === "proof"),
    follow: actions.filter(a => a.type === "follow"),
    reception: actions.filter(a => a.type === "reception"),
    recurring: actions.filter(a => a.type === "recurring"),
    update: actions.filter(a => a.type === "update"),
    quote_builder: actions.filter(a => a.type === "quote_builder"),
    memory: actions.filter(a => a.type === "memory"),
  }), [actions]);

  const activeJobs = data.jobs.filter(j => !isClosedJob(j));
  const todayJobs = data.jobs.filter(j => String(j.scheduled_date || j.date || j.start_date || j.due_date || "").startsWith(safeDateKey())).slice(0, 5);
  const runSheet = todayJobs.length ? todayJobs : activeJobs.slice(0, 5);
  const moneyWaiting = data.invoices.reduce((sum, i) => ["sent", "open", "overdue", "unpaid", "pending_payment"].includes(norm(i.status)) ? sum + Number(i.balance_due ?? i.balance ?? i.amount_due ?? i.total ?? i.amount ?? 0) : sum, 0);
  const best = groups.dispatch[0] || groups.revenue[0] || groups.follow[0] || groups.proof[0] || actions[0];

  const runAiPlan = async () => { setNotice(""); setError(""); try { await post("/smart-hub/scan", {}); setNotice("AI plan ran. Command refreshed."); await load(); } catch { setError("AI plan could not run yet."); } };
  const executeCommandAction = async (action) => {
    setNotice(""); setError("");
    try {
      const res = await post("/command-hub/actions/execute", { action_type: action.type, job_id: action.job_id, invoice_id: action.invoice_id, quote_id: action.quote_id });
      if (res?.success === false) setError(res.message || "Command action needs review.");
      else { setNotice(res?.message || "Command action completed."); await load(); }
    } catch { setError("Command action could not run yet. Open the record to review safely."); }
  };
  const dismissAction = (action) => setHidden((h) => ({ ...h, [action.id]: true }));

  const openActionDrawer = (title, subtitle, items) => setDrawer({ type: "actions", title, subtitle, items });
  const openWorkspace = (workspace) => setDrawer({ type: "workspace", ...workspace });
  const openAskAi = () => setDrawer({ type: "ask", title: "Ask AI Operator", subtitle: "Local Command summary based on the live business data loaded on this page." });

  if (!canUseCommand(user?.role)) return <Layout><main className="smart-command-system"><section className="command-panel"><h2>Command Hub is owner/admin only.</h2></section></main></Layout>;

  const workspaceItems = [
    { label: "Jobs", to: "/jobs", text: "Create, schedule, assign", items: runSheet },
    { label: "Clients", to: "/clients", text: `${data.clients.length} customers/properties`, items: data.clients.slice(0, 8) },
    { label: "Quotes", to: "/quotes", text: `${data.quotes.length} quotes loaded`, items: data.quotes.slice(0, 8) },
    { label: "Invoices", to: "/invoices", text: `${groups.follow.length} reminders ready`, items: data.invoices.slice(0, 8) },
    { label: "Team", to: "/team", text: `${data.workers.length} workers active`, items: data.workers.slice(0, 8) },
    { label: "Dispatch", to: "/dispatch", text: `${groups.dispatch.length} jobs need crew`, items: groups.dispatch },
    { label: "Proof-to-Paid", to: "/proof-to-paid", text: `${groups.proof.length} proof packs needed`, items: groups.proof },
    { label: "Plans", to: "/plans", text: "Choose or change plan", items: [] },
    { label: "Settings", to: "/settings", text: "Business setup", items: [] },
    { label: "Contact Us", to: "/contact", text: "Help and support", items: [] },
    { label: "Privacy", to: "/privacy", text: "Privacy policy", items: [] },
    { label: "Terms", to: "/terms", text: "Terms of use", items: [] },
  ];

  return <Layout smartHubMode><main className="smart-command-system"><div className="command-real-shell">
    <section className="command-hero">
      <div className="command-hero-brand"><ChurvoxLogo size="hero" /></div>
      <div className="command-hero-copy"><p className="smart-command-kicker">Smart Hub</p><h1>AI Control Room</h1><p>Churvox watches the business, prepares the admin, and brings the owner the safest next move to approve.</p><div className="command-hero-actions"><button className="command-btn orange" onClick={runAiPlan}>Run AI plan</button><button className="command-btn light" onClick={openAskAi}>Ask AI Operator</button><button className="command-btn dark" onClick={() => openActionDrawer("Approval Queue", "Review the work Command prepared.", actions)}>Open queue</button></div></div>
      <aside className="command-hero-score"><span>Today</span><strong>{actions.length} actions</strong><strong>{data.workers.length} workers active</strong><strong>{money(moneyWaiting)} waiting</strong></aside>
    </section>

    {notice ? <section className="command-notice">{notice}</section> : null}{error ? <section className="command-error">{error}</section> : null}{loading ? <section className="command-notice">Loading Command...</section> : null}

    <section className="command-operator-card">
      <div><p className="smart-command-kicker">AI Operator</p><h2>Today’s business plan</h2><p>{best ? `Start with: ${best.title}. ${best.reason}` : "No urgent work is blocking the business right now."}</p></div>
      <div className="command-metric-row"><Metric label="Need crew" value={groups.dispatch.length} text="dispatch pressure" /><Metric label="Follow-ups" value={groups.follow.length} text="quotes/invoices" /><Metric label="Revenue work" value={groups.revenue.length} text="pricing/invoice" /><Metric label="Proof needed" value={groups.proof.length} text="proof-to-paid" /></div>
      <div className="command-card-actions"><button className="command-btn orange" onClick={() => openActionDrawer("Today’s Plan", "AI grouped the work that matters most first.", actions)}>Review plan</button><button className="command-btn light" onClick={openAskAi}>Ask what to do first</button></div>
    </section>

    <section className="command-next-grid">
      <NextMove title="Assign crew" count={groups.dispatch.length} text="Open dispatch plan inside Command" onClick={() => openActionDrawer("Dispatch Plan", "Jobs waiting for crew assignment.", groups.dispatch)} />
      <NextMove title="Chase money" count={groups.follow.length + groups.revenue.length} text="Invoice, pricing, and quote follow-up" tone="blue" onClick={() => openActionDrawer("Revenue Plan", "Money and follow-up work Command found.", [...groups.revenue, ...groups.follow])} />
      <NextMove title="Keep work moving" count={runSheet.length} text="Open today’s run sheet" tone="dark" onClick={() => setDrawer({ type: "runsheet", title: "Today’s Run Sheet", subtitle: "Jobs moving today.", items: runSheet })} />
    </section>

    <section className="command-panel"><div className="command-section-head"><div><p className="smart-command-kicker">Main Hub</p><h2>Access everything without losing Command</h2><p>Tap a workspace to open a same-page drawer first. Use “Open full workspace” only when you need the full page.</p></div></div><div className="command-workspace-grid">{workspaceItems.map((w) => <WorkspaceButton key={w.label} label={w.label} text={w.text} onClick={() => openWorkspace({ title: w.label, subtitle: w.text, to: w.to, items: w.items })} />)}</div></section>

    <section className="command-control-grid"><ControlCard title="Dispatch Command" count={groups.dispatch.length} text="Crew assignment and dispatch balancing." active={groups.dispatch.length > 0} onClick={() => openActionDrawer("Dispatch Command", "Assign or review unassigned jobs.", groups.dispatch)} /><ControlCard title="Revenue Command" count={groups.revenue.length} text="Invoices, pricing, and cashflow follow-through." active={groups.revenue.length > 0} onClick={() => openActionDrawer("Revenue Command", "Completed work ready for pricing or draft invoices.", groups.revenue)} /><ControlCard title="Proof-to-Paid" count={groups.proof.length} text="Proof packs required before payment chase." active={groups.proof.length > 0} onClick={() => openActionDrawer("Proof-to-Paid Command", "Completed jobs missing proof assets.", groups.proof)} /><ControlCard title="Follow-Up Command" count={groups.follow.length} text="Quote and invoice follow-up preparation." active={groups.follow.length > 0} onClick={() => openActionDrawer("Follow-Up Command", "Prepared invoice and quote follow-up work.", groups.follow)} /><ControlCard title="Team/Crew" count={data.workers.length} text="Team capacity and worker availability." active={data.workers.length > 0} onClick={() => openWorkspace({ title: "Team", subtitle: "Workers loaded from your business.", to: "/team", items: data.workers.slice(0, 8) })} /><ControlCard title="Account Health" count={data.health?.warnings?.length || 0} text="Plan, billing, and account risk warnings." active={Boolean(data.health?.warnings?.length)} onClick={() => openWorkspace({ title: "Account & Plan", subtitle: "Plans, billing, support, and legal access.", to: "/plans", items: [] })} /></section>

    <section className="command-panel"><div className="command-section-head"><div><p className="smart-command-kicker">Today’s run sheet</p><h2>Work moving today</h2></div><button className="command-btn light" onClick={() => routeTo("/jobs")}>Open full jobs</button></div>{runSheet.length ? <div className="command-run-list">{runSheet.map(job => <article key={idOf(job)}><b>{cleanJobTitle(job, data.clients)}</b><span>{clientNameFor(job, data.clients)} · {job.status || "open"}</span><button onClick={() => setDrawer({ type: "job", title: cleanJobTitle(job, data.clients), subtitle: `${clientNameFor(job, data.clients)} · ${job.status || "open"}`, job })}>View inside Command</button></article>)}</div> : <div className="command-empty"><p>No jobs scheduled for today yet.</p><button onClick={() => routeTo("/jobs/new")}>Create Job</button><button onClick={() => routeTo("/jobs")}>Open Jobs</button></div>}</section>

    <section className="command-panel"><div className="command-section-head"><div><p className="smart-command-kicker">Approval queue</p><h2>Grouped AI work</h2><p>Command keeps the details tucked away until you open them.</p></div><span className="command-pill">{actions.length} ready</span></div><div className="command-filter-grid">{[["Approvals", actions], ["Dispatch", groups.dispatch], ["Revenue", groups.revenue], ["Follow-Ups", groups.follow], ["Proof", groups.proof], ["Reception", groups.reception], ["Recurring", groups.recurring], ["Updates", groups.update], ["Quote Builder", groups.quote_builder], ["Client Memory", groups.memory]].map(([label, items]) => <button key={label} className={items.length ? "active" : ""} onClick={() => openActionDrawer(label, `Focused ${label.toLowerCase()} work.`, items)}>{label}<span>{items.length} items</span></button>)}</div></section>

    <Drawer drawer={drawer} onClose={() => setDrawer(null)}>
      {drawer?.type === "ask" ? <div className="command-drawer-stack"><p><b>What I’d do first:</b> {best ? `${best.title}. ${best.reason}` : "Nothing urgent is blocking the business right now."}</p><div className="command-prompt-grid">{["What needs doing today?", "Which jobs need crew?", "What invoices need chasing?", "What should I do first?", "What proof packs are missing?"].map(q => <button key={q} onClick={() => setNotice(`${q} — Command is using the live counts on this dashboard for now.`)}>{q}</button>)}</div></div> : null}
      {drawer?.type === "actions" ? <div className="command-action-list">{drawer.items?.length ? drawer.items.map(action => <ActionCard key={`drawer-${action.id}`} action={action} onDismiss={dismissAction} onExecute={executeCommandAction} />) : <div className="command-empty"><p>No work in this section right now.</p></div>}</div> : null}
      {drawer?.type === "workspace" ? <div className="command-drawer-stack"><button className="command-btn orange" onClick={() => routeTo(drawer.to)}>Open full workspace</button>{drawer.items?.length ? drawer.items.map((item, idx) => <article className="command-preview-row" key={idOf(item) || idx}><b>{item.title || item.name || item.business_name || item.company_name || item.invoice_number || item.quote_number || item.email || `Item ${idx + 1}`}</b><span>{item.status || item.role || item.email || drawer.subtitle}</span></article>) : <div className="command-empty"><p>No preview items loaded. Open the full workspace for setup or details.</p></div>}</div> : null}
      {drawer?.type === "runsheet" ? <div className="command-run-list">{drawer.items?.map(job => <article key={`drawer-job-${idOf(job)}`}><b>{cleanJobTitle(job, data.clients)}</b><span>{clientNameFor(job, data.clients)} · {job.status || "open"}</span><button onClick={() => routeTo(`/jobs/${idOf(job)}`)}>Open full job</button></article>)}</div> : null}
      {drawer?.type === "job" ? <div className="command-drawer-stack"><p><b>Client:</b> {drawer.subtitle}</p><p><b>Address:</b> {drawer.job?.address || drawer.job?.job_address || "No address saved"}</p><p><b>Assigned:</b> {drawer.job?.assigned_worker_name || drawer.job?.assigned_worker || "No worker assigned"}</p><div className="command-card-actions"><button className="command-btn orange" onClick={() => routeTo(`/jobs/${idOf(drawer.job)}`)}>Open full job</button><button className="command-btn light" onClick={() => openActionDrawer("Dispatch", "Related dispatch actions.", groups.dispatch.filter(a => a.job_id === idOf(drawer.job)))}>Dispatch actions</button></div></div> : null}
    </Drawer>
  </div></main></Layout>;
}
