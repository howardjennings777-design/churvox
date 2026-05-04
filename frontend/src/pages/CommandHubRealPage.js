import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post, patch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import "../styles/smartCommandSystem.css";
import "../styles/commandHubReal.css";
import "../styles/commandHubCompact.css";

const norm = (value) => String(value || "").toLowerCase().trim();
const idOf = (item) => String(item?.id || item?._id || item?.uuid || "");
const todayKey = () => new Date().toISOString().slice(0, 10);
const money = (value) => Number.isFinite(Number(value)) ? `$${Number(value).toFixed(2)}` : "amount unknown";
const ownerRoles = ["owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"];
const canUseCommand = (role) => ownerRoles.includes(norm(role));
const unwrap = (value) => value?.data !== undefined ? value.data : value;
const listFrom = (value, keys = []) => {
  const v = unwrap(value);
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  for (const key of keys) if (Array.isArray(v[key])) return v[key];
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.items)) return v.items;
  return [];
};
const safeGet = async (path) => {
  try { return await get(path); } catch { return []; }
};
const routeTo = (path) => window.location.assign(path);

function isClosedJob(job) {
  return ["completed", "complete", "cancelled", "canceled", "archived"].includes(norm(job?.status));
}
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
function actionButtonLabel(action) {
  if (action.type === "dispatch") return "Assign worker";
  if (action.type === "invoice") return "Create draft invoice";
  if (action.type === "proof") return "Prepare proof pack";
  if (action.type === "follow") return "Prepare follow-up";
  return "Review";
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
    const assigned = job.assigned_worker_id || job.worker_id || job.assigned_worker;
    const label = cleanJobTitle(job, clients);
    const client = clientNameFor(job, clients);

    if (!assigned && !isClosedJob(job)) {
      actions.push({ id: `dispatch-${jobId}`, type: "dispatch", priority: "high", executable: true, title: `Assign crew to ${label}`, summary: `${client} has a job with no worker assigned.`, reason: "Unassigned jobs block the day and stop work moving.", next: "Choose a worker in the drawer or let Command use the first safe option.", job_id: jobId });
    }

    if (["completed", "complete"].includes(norm(job.status)) && !job.invoice_id && !job.draft_invoice_id && !invoiceJobIds.has(jobId)) {
      const amount = job.fixed_price ?? job.price ?? job.subtotal ?? job.amount;
      const priced = Number.isFinite(Number(amount)) && Number(amount) > 0;
      actions.push({ id: `invoice-${jobId}`, type: priced ? "invoice" : "pricing", priority: priced ? "medium" : "high", executable: priced, title: priced ? `Create draft invoice for ${label}` : `Add pricing for ${label}`, summary: priced ? `Suggested amount: ${money(amount)}.` : "Completed job needs a safe price before invoicing.", reason: priced ? "Completed work is ready to become a draft invoice." : "Churvox must not create a $0 invoice.", next: priced ? "Create a draft invoice only. No send, charge, or MYOB sync." : "Add pricing inside the drawer first.", job_id: jobId });
      const hasProof = job.proof_pack_id || job.proof_pack_ready || proofPacks.some((p) => String(p.job_id || p.jobId || "") === jobId);
      if (!hasProof) actions.push({ id: `proof-${jobId}`, type: "proof", priority: "medium", executable: true, title: `Prepare proof pack for ${label}`, summary: "Completed work needs proof before payment follow-up.", reason: "Proof-to-Paid needs customer-ready proof assets.", next: "Prepare a proof pack for owner review.", job_id: jobId });
    }
  });

  invoices.forEach((invoice) => {
    const invoiceId = idOf(invoice);
    if (!invoiceId) return;
    const status = norm(invoice.status);
    if (["sent", "open", "overdue", "unpaid", "pending_payment"].includes(status)) {
      actions.push({ id: `invoice-follow-${invoiceId}`, type: "follow", priority: status === "overdue" ? "high" : "medium", executable: true, title: `Prepare reminder for invoice ${invoice.invoice_number || invoice.number || invoiceId.slice(-6)}`, summary: `${money(invoice.balance_due ?? invoice.balance ?? invoice.amount_due ?? invoice.total ?? invoice.amount)} outstanding.`, reason: "Money is waiting to come in.", next: "Prepare a reminder draft only. Nothing sends automatically.", invoice_id: invoiceId });
    }
  });

  quotes.forEach((quote) => {
    const quoteId = idOf(quote);
    if (!quoteId) return;
    if (["sent", "pending", "waiting", "viewed", "draft"].includes(norm(quote.status))) {
      actions.push({ id: `quote-follow-${quoteId}`, type: "follow", priority: "medium", executable: true, title: `Prepare quote follow-up ${quote.quote_number || quote.number || quoteId.slice(-6)}`, summary: "Quote is waiting for a customer decision.", reason: "Follow-up can help convert quoted work into booked work.", next: "Prepare a follow-up draft only. Nothing sends automatically.", quote_id: quoteId });
    }
  });

  const simple = [[data.receptionist || [], "reception", "Review new enquiry"], [data.recurring || [], "recurring", "Recurring work due"], [data.customerUpdates || [], "update", "Customer update ready"], [data.quoteDrafts || [], "quote_builder", "Quote draft ready"], [data.memory || [], "memory", "Client memory suggestion"]];
  simple.forEach(([items, type, fallback]) => items.forEach((item, index) => actions.push({ id: `${type}-${idOf(item) || index}`, type, priority: "medium", executable: false, title: item.title || item.customer_name || fallback, summary: item.message || item.summary || item.description || item.ai_summary || "Needs review.", reason: "Command found this in your business data.", next: "Review inside Command before anything is sent or changed.", client_id: item.client_id || item.suggested_client_id, job_id: item.job_id, quote_id: item.quote_id, invoice_id: item.invoice_id })));

  const unique = new Map();
  actions.forEach((action) => { if (action.id && !hidden[action.id] && !unique.has(action.id)) unique.set(action.id, action); });
  return Array.from(unique.values());
}

function Metric({ label, value, text }) {
  return <div className="command-mini-metric"><strong>{value}</strong><span>{label}</span><small>{text}</small></div>;
}
function NextMove({ title, count, text, onClick, tone = "orange" }) {
  return <button className={`command-next-move ${tone}`} onClick={onClick}><span>{title}</span><strong>{count}</strong><small>{text}</small></button>;
}
function WorkspaceButton({ label, text, onClick }) {
  return <button type="button" className="command-workspace-btn" onClick={onClick}><strong>{label}</strong><span>{text}</span></button>;
}
function ControlCard({ title, count, text, onClick, active }) {
  return <article className={`command-control-card ${active ? "active" : "quiet"}`}><div><h3>{title}</h3><p>{text}</p></div><strong>{count}</strong><button type="button" onClick={onClick}>Work here</button></article>;
}
function Drawer({ drawer, onClose, children }) {
  if (!drawer) return null;
  return <div className="command-drawer-backdrop" onClick={onClose}>
    <aside className="command-drawer" onClick={(e) => e.stopPropagation()}>
      <div className="command-drawer-head"><div><p className="smart-command-kicker">Work inside Command</p><h2>{drawer.title}</h2>{drawer.subtitle ? <p>{drawer.subtitle}</p> : null}</div><button onClick={onClose}>Close</button></div>
      {children}
    </aside>
  </div>;
}
function ActionCard({ action, onDismiss, onExecute, onOpenJobEditor }) {
  const canExecute = ["dispatch", "invoice", "proof", "follow"].includes(action.type) && action.executable;
  return <article className="command-action-card">
    <div className="command-card-top"><span className={`command-priority ${action.priority}`}>{action.priority}</span><span>{action.type}</span>{canExecute ? <span className="ready">ready</span> : <span>review</span>}</div>
    <h3>{action.title}</h3><p>{action.summary}</p><p><b>Why AI picked this:</b> {action.reason}</p><p><b>What happens next:</b> {action.next}</p>
    <div className="command-card-actions">
      {canExecute ? <button className="command-btn green" onClick={() => onExecute(action)}>{actionButtonLabel(action)}</button> : null}
      {action.job_id ? <button className="command-btn dark" onClick={() => onOpenJobEditor(action.job_id)}>Edit in drawer</button> : null}
      <button className="command-btn light" onClick={() => routeTo(actionPath(action))}>Open full page</button>
      <button className="command-btn ghost" onClick={() => onDismiss(action)}>Dismiss</button>
    </div>
  </article>;
}

function JobEditor({ job, clients, workers, onSave, onExecute, onClose }) {
  const [draft, setDraft] = useState({
    title: job?.title || job?.name || "",
    status: job?.status || "assigned",
    assigned_worker_id: job?.assigned_worker_id || job?.worker_id || "",
    price: job?.price || job?.fixed_price || job?.subtotal || "",
    notes: job?.notes || "",
  });
  const jobId = idOf(job);
  const client = clientNameFor(job, clients);
  return <div className="command-drawer-stack">
    <div className="command-editor-card"><p className="smart-command-kicker">Job workspace</p><h3>{cleanJobTitle(job, clients)}</h3><p>{client} · {job?.address || job?.job_address || "No address saved"}</p></div>
    <label>Job title<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
    <label>Status<select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="assigned">Assigned</option><option value="acknowledged">Acknowledged</option><option value="in_progress">In Progress</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
    <label>Assigned worker<select value={draft.assigned_worker_id} onChange={(e) => setDraft({ ...draft, assigned_worker_id: e.target.value })}><option value="">Choose worker</option>{workers.map((w) => <option key={idOf(w)} value={idOf(w)}>{w.name || w.email || "Worker"}</option>)}</select></label>
    <label>Job price<input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="Price before invoicing" /></label>
    <label>Notes<textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></label>
    <div className="command-card-actions"><button className="command-btn green" onClick={() => onSave(jobId, draft)}>Save job</button><button className="command-btn orange" onClick={() => onExecute({ type: "dispatch", job_id: jobId, executable: true })}>Assign safely</button><button className="command-btn dark" onClick={() => onExecute({ type: "invoice", job_id: jobId, executable: true })}>Create draft invoice</button><button className="command-btn light" onClick={() => onExecute({ type: "proof", job_id: jobId, executable: true })}>Prepare proof</button><button className="command-btn ghost" onClick={onClose}>Done</button></div>
  </div>;
}

function MiniTile({ title, text, action, tone = "dark" }) {
  return <button className={`command-mini-tile ${tone}`} onClick={action}><strong>{title}</strong><span>{text}</span></button>;
}
function SmallFallback({ to }) {
  return <div className="command-drawer-fallback"><button className="command-btn ghost" onClick={() => routeTo(to)}>Open full page if needed</button></div>;
}
function AccountWorkspace({ drawer, user, data, setNotice }) {
  const title = norm(drawer.title);
  const plan = user?.plan || user?.subscription_plan || user?.plan_name || "Not selected";
  const status = user?.plan_status || user?.subscription_status || user?.status || "unknown";
  const email = user?.email || "No email loaded";

  if (title.includes("plan") || title.includes("billing") || title.includes("account")) {
    return <div className="command-drawer-stack">
      <div className="command-editor-card"><p className="smart-command-kicker">Owner account</p><h3>{plan}</h3><p>Status: {status} · {email}</p></div>
      <div className="command-account-grid drawer-grid">
        <MiniTile title="Change plan" text="Review Solo, Team, Pro, Enterprise" action={() => routeTo("/plans")} tone="orange" />
        <MiniTile title="Billing status" text="Check subscription and trial" action={() => setNotice("Billing status is shown from your loaded account. Open Plans for Stripe changes.")} />
        <MiniTile title="Usage limits" text="Clients, team, MYOB/SMS access" action={() => setNotice(`Clients loaded: ${data.clients.length}. Workers loaded: ${data.workers.length}.`)} />
        <MiniTile title="MYOB access" text="Pro add-on / Enterprise included" action={() => routeTo("/integrations")} />
      </div>
      <SmallFallback to="/plans" />
    </div>;
  }

  if (title.includes("setting")) {
    return <div className="command-drawer-stack">
      <div className="command-editor-card"><p className="smart-command-kicker">Business settings</p><h3>Quick setup</h3><p>Update the core business details owners need often.</p></div>
      <label>Business name<input defaultValue={user?.business_name || user?.company_name || ""} placeholder="Business name" /></label>
      <label>Industry<input defaultValue={user?.industry || ""} placeholder="Lawn Care, Cleaning, Handyman..." /></label>
      <label>Business email<input defaultValue={email} placeholder="Email" /></label>
      <label>Phone<input defaultValue={user?.phone || ""} placeholder="Phone" /></label>
      <div className="command-card-actions"><button className="command-btn orange" onClick={() => setNotice("Settings quick edit is ready visually. Use full Settings page to save until the settings save endpoint is confirmed.")}>Save settings</button><button className="command-btn light" onClick={() => routeTo("/settings")}>Open full settings</button></div>
    </div>;
  }

  if (title.includes("contact")) {
    return <div className="command-drawer-stack">
      <div className="command-editor-card"><p className="smart-command-kicker">Support</p><h3>Contact Churvox</h3><p>Get help with setup, billing, plans, integrations, or Command Hub.</p></div>
      <div className="command-account-grid drawer-grid"><MiniTile title="Email support" text="hello@churvox.com" action={() => window.location.href = "mailto:hello@churvox.com?subject=Churvox%20support%20request"} tone="orange" /><MiniTile title="Plan help" text="Billing and subscription support" action={() => routeTo("/plans")} /><MiniTile title="Setup help" text="Business settings and onboarding" action={() => routeTo("/settings")} /></div>
      <label>Message<textarea placeholder="Write what you need help with..." /></label>
      <button className="command-btn orange" onClick={() => window.location.href = "mailto:hello@churvox.com?subject=Churvox%20support%20request"}>Send by email</button>
    </div>;
  }

  if (title.includes("notification")) {
    return <div className="command-drawer-stack">
      <div className="command-editor-card"><p className="smart-command-kicker">Notifications</p><h3>Alerts and updates</h3><p>Control the alerts that keep the owner on top of the business.</p></div>
      <div className="command-account-grid drawer-grid"><MiniTile title="Job updates" text="Assigned, started, completed" action={() => setNotice("Job notification controls are staged in Command.")} /><MiniTile title="Money alerts" text="Invoices and quote follow-ups" action={() => setNotice("Money notification controls are staged in Command.")} /><MiniTile title="Team alerts" text="Worker actions and schedule changes" action={() => setNotice("Team notification controls are staged in Command.")} /></div>
      <SmallFallback to="/notifications" />
    </div>;
  }

  if (title.includes("integration")) {
    return <div className="command-drawer-stack">
      <div className="command-editor-card"><p className="smart-command-kicker">Integrations</p><h3>Connected tools</h3><p>Manage MYOB, SMS, and future trade/business integrations.</p></div>
      <div className="command-account-grid drawer-grid"><MiniTile title="MYOB" text="Invoice/payment sync setup" action={() => routeTo("/integrations")} tone="orange" /><MiniTile title="SMS" text="Credits and reminders" action={() => routeTo("/sms")} /><MiniTile title="Future tools" text="Connect more systems later" action={() => setNotice("More integrations are planned after launch-critical flows are stable.")} /></div>
      <SmallFallback to="/integrations" />
    </div>;
  }

  if (title.includes("privacy")) {
    return <div className="command-drawer-stack"><div className="command-editor-card"><p className="smart-command-kicker">Legal</p><h3>Privacy</h3><p>Churvox should protect customer, job, worker, invoice, and account data. Open the full policy when you need the complete legal text.</p></div><SmallFallback to="/privacy" /></div>;
  }

  if (title.includes("terms")) {
    return <div className="command-drawer-stack"><div className="command-editor-card"><p className="smart-command-kicker">Legal</p><h3>Terms</h3><p>Review the rules for using Churvox, subscriptions, acceptable use, and platform responsibilities.</p></div><SmallFallback to="/terms" /></div>;
  }

  if (title.includes("deletion")) {
    return <div className="command-drawer-stack"><div className="command-editor-card"><p className="smart-command-kicker">Account deletion</p><h3>Delete account information</h3><p>Use this area to request account deletion or review the process before removing data.</p></div><div className="command-card-actions"><button className="command-btn orange" onClick={() => window.location.href = "mailto:hello@churvox.com?subject=Account%20deletion%20request"}>Request deletion</button><button className="command-btn light" onClick={() => routeTo("/account-deletion")}>Open deletion page</button></div></div>;
  }

  return null;
}
function PreviewItem({ item, drawer, onJob, onExecute }) {
  const id = idOf(item);
  const looksAction = Boolean(item?.type && (item?.job_id || item?.invoice_id || item?.quote_id));
  if (looksAction) return <ActionCard action={item} onDismiss={() => {}} onExecute={onExecute} onOpenJobEditor={onJob} />;
  return <article className="command-preview-row"><b>{item.title || item.name || item.business_name || item.company_name || item.invoice_number || item.quote_number || item.email || `Item`}</b><span>{item.status || item.role || item.email || drawer.subtitle}</span>{drawer.title === "Jobs" || item.address ? <button onClick={() => onJob(id)}>Edit</button> : null}</article>;
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
      const [jobs, clients, invoices, quotes, workers, proofPacks, receptionist, recurring, customerUpdates, quoteDrafts, memory, health] = await Promise.all([safeGet("/jobs"), safeGet("/clients"), safeGet("/invoices"), safeGet("/quotes"), safeGet("/team/workers"), safeGet("/proof-packs"), safeGet("/api/ai/receptionist/enquiries"), safeGet("/api/ai/recurring"), safeGet("/api/ai/customer-updates"), safeGet("/api/ai/quotes/drafts"), safeGet("/api/ai/client-memory"), safeGet("/api/ai/operator/business-health")]);
      setData({ jobs: listFrom(jobs, ["jobs"]), clients: listFrom(clients, ["clients"]), invoices: listFrom(invoices, ["invoices"]), quotes: listFrom(quotes, ["quotes"]), workers: listFrom(workers, ["workers", "items"]), proofPacks: listFrom(proofPacks, ["proof_packs", "items"]), receptionist: listFrom(receptionist, ["enquiries", "items"]), recurring: listFrom(recurring, ["rules", "items"]), customerUpdates: listFrom(customerUpdates, ["updates", "items"]), quoteDrafts: listFrom(quoteDrafts, ["drafts", "items"]), memory: listFrom(memory, ["items", "actions"]), health: unwrap(health) || {} });
    } catch { setError("Command could not load business data yet."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const actions = useMemo(() => buildCommandActions(data, hidden), [data, hidden]);
  const groups = useMemo(() => ({ dispatch: actions.filter(a => a.type === "dispatch"), revenue: actions.filter(a => ["invoice", "pricing"].includes(a.type)), proof: actions.filter(a => a.type === "proof"), follow: actions.filter(a => a.type === "follow"), reception: actions.filter(a => a.type === "reception"), recurring: actions.filter(a => a.type === "recurring"), update: actions.filter(a => a.type === "update"), quote_builder: actions.filter(a => a.type === "quote_builder"), memory: actions.filter(a => a.type === "memory") }), [actions]);
  const activeJobs = data.jobs.filter(j => !isClosedJob(j));
  const todayJobs = data.jobs.filter(j => String(j.scheduled_date || j.date || j.start_date || j.due_date || "").startsWith(todayKey())).slice(0, 5);
  const runSheet = todayJobs.length ? todayJobs : activeJobs.slice(0, 5);
  const moneyWaiting = data.invoices.reduce((sum, i) => ["sent", "open", "overdue", "unpaid", "pending_payment"].includes(norm(i.status)) ? sum + Number(i.balance_due ?? i.balance ?? i.amount_due ?? i.total ?? i.amount ?? 0) : sum, 0);
  const best = groups.dispatch[0] || groups.revenue[0] || groups.follow[0] || groups.proof[0] || actions[0];

  const openActionDrawer = (title, subtitle, items) => setDrawer({ type: "actions", title, subtitle, items });
  const openWorkspace = (workspace) => setDrawer({ type: "workspace", ...workspace });
  const openAskAi = () => setDrawer({ type: "ask", title: "Ask AI Operator", subtitle: "Live Command summary. No fake external AI response yet." });
  const openJobEditor = (jobId) => {
    const job = data.jobs.find((j) => idOf(j) === String(jobId));
    if (job) setDrawer({ type: "job", title: cleanJobTitle(job, data.clients), subtitle: `${clientNameFor(job, data.clients)} · ${job.status || "open"}`, job });
    else setError("Job could not be found in loaded Command data.");
  };

  const runAiPlan = async () => { setNotice(""); setError(""); try { await post("/smart-hub/scan", {}); setNotice("AI plan ran. Command refreshed."); await load(); } catch { setError("AI plan could not run yet."); } };
  const executeCommandAction = async (action) => {
    setNotice(""); setError("");
    try {
      const res = await post("/command-hub/actions/execute", { action_type: action.type, job_id: action.job_id, invoice_id: action.invoice_id, quote_id: action.quote_id });
      const payload = unwrap(res);
      if (!res?.success || payload?.success === false) setError(payload?.message || res?.message || "Command action needs review.");
      else { setNotice(payload?.message || "Command action completed."); await load(); }
    } catch { setError("Command action could not run yet. Stay in the drawer and review safely."); }
  };
  const saveJobFromDrawer = async (jobId, draft) => {
    setNotice(""); setError("");
    try {
      const payload = { title: draft.title, status: draft.status, assigned_worker_id: draft.assigned_worker_id || undefined, worker_id: draft.assigned_worker_id || undefined, price: Number(draft.price || 0), notes: draft.notes };
      const res = await patch(`/jobs/${jobId}`, payload);
      if (!res?.success) setError(res?.message || res?.error || "Job could not be saved from Command.");
      else { setNotice("Job updated from Command."); await load(); }
    } catch { setError("Job save failed. The drawer stayed open so you do not lose context."); }
  };
  const dismissAction = (action) => setHidden((h) => ({ ...h, [action.id]: true }));

  if (!canUseCommand(user?.role)) return <Layout><main className="smart-command-system"><section className="command-panel"><h2>Command Hub is owner/admin only.</h2></section></main></Layout>;

  const workspaceItems = [
    { label: "Jobs", to: "/jobs", text: "Create, schedule, assign", items: runSheet }, { label: "Clients", to: "/clients", text: `${data.clients.length} customers/properties`, items: data.clients.slice(0, 8) }, { label: "Quotes", to: "/quotes", text: `${data.quotes.length} quotes loaded`, items: data.quotes.slice(0, 8) }, { label: "Invoices", to: "/invoices", text: `${groups.follow.length} reminders ready`, items: data.invoices.slice(0, 8) }, { label: "Team", to: "/team", text: `${data.workers.length} workers active`, items: data.workers.slice(0, 8) }, { label: "Dispatch", to: "/dispatch", text: `${groups.dispatch.length} jobs need crew`, items: groups.dispatch }, { label: "Proof-to-Paid", to: "/proof-to-paid", text: `${groups.proof.length} proof packs needed`, items: groups.proof }, { label: "Account & Plan", to: "/plans", text: "Plan, billing, limits", items: [] }, { label: "Plans / Billing", to: "/plans", text: "Choose or change plan", items: [] }, { label: "Settings", to: "/settings", text: "Business setup", items: [] }, { label: "Contact Us", to: "/contact", text: "Help and support", items: [] }, { label: "Notifications", to: "/notifications", text: "Alerts and updates", items: [] }, { label: "Integrations", to: "/integrations", text: "MYOB and connected tools", items: [] }, { label: "Privacy", to: "/privacy", text: "Privacy policy", items: [] }, { label: "Terms", to: "/terms", text: "Terms of use", items: [] }, { label: "Account Deletion", to: "/account-deletion", text: "Delete account info", items: [] },
  ];

  return <Layout smartHubMode><main className="smart-command-system"><div className="command-real-shell">
    <section className="command-hero"><div className="command-hero-brand"><ChurvoxLogo size="hero" /></div><div className="command-hero-copy"><p className="smart-command-kicker">Smart Hub</p><h1>AI Control Room</h1><p>Churvox watches the business, prepares the admin, and lets the owner approve and work from one page.</p><div className="command-hero-actions"><button className="command-btn orange" onClick={runAiPlan}>Run AI plan</button><button className="command-btn light" onClick={openAskAi}>Ask AI Operator</button><button className="command-btn dark" onClick={() => openActionDrawer("Approval Queue", "Review and execute the work Command prepared.", actions)}>Open queue</button></div></div><aside className="command-hero-score"><span>Today</span><strong>{actions.length} actions</strong><strong>{data.workers.length} workers active</strong><strong>{money(moneyWaiting)} waiting</strong></aside></section>
    {notice ? <section className="command-notice">{notice}</section> : null}{error ? <section className="command-error">{error}</section> : null}{loading ? <section className="command-notice">Loading Command...</section> : null}

    <section className="command-operator-card"><div><p className="smart-command-kicker">Zone 1 · AI Today Plan</p><h2>AI Operator: today’s business plan</h2><p>{best ? `Start with: ${best.title}. ${best.reason}` : "No urgent work is blocking the business right now."}</p></div><div className="command-metric-row"><Metric label="Need crew" value={groups.dispatch.length} text="dispatch pressure" /><Metric label="Follow-ups" value={groups.follow.length} text="quotes/invoices" /><Metric label="Revenue work" value={groups.revenue.length} text="pricing/invoice" /><Metric label="Proof needed" value={groups.proof.length} text="proof-to-paid" /></div><div className="command-card-actions"><button className="command-btn orange" onClick={() => openActionDrawer("Today’s Plan", "AI grouped the work that matters most first.", actions)}>Work the plan</button><button className="command-btn light" onClick={openAskAi}>Ask what to do first</button></div></section>

    <section className="command-next-grid"><NextMove title="Zone 2 · Assign crew" count={groups.dispatch.length} text="Work dispatch inside Command" onClick={() => openActionDrawer("Dispatch Plan", "Assign or edit unassigned jobs without leaving Command.", groups.dispatch)} /><NextMove title="Zone 2 · Chase money" count={groups.follow.length + groups.revenue.length} text="Invoices, pricing, quote follow-up" tone="blue" onClick={() => openActionDrawer("Revenue Plan", "Money and follow-up work Command found.", [...groups.revenue, ...groups.follow])} /><NextMove title="Zone 2 · Keep work moving" count={runSheet.length} text="Open today’s run sheet" tone="dark" onClick={() => setDrawer({ type: "runsheet", title: "Today’s Run Sheet", subtitle: "Jobs moving today. Edit and action them here.", items: runSheet })} /></section>

    <section className="command-panel"><div className="command-section-head"><div><p className="smart-command-kicker">Zone 4 · Workspaces</p><h2>Access everything without losing Command</h2><p>Each workspace opens inside this page first. Full-page navigation is now only the fallback.</p></div></div><div className="command-workspace-grid">{workspaceItems.map((w) => <WorkspaceButton key={w.label} label={w.label} text={w.text} onClick={() => openWorkspace({ title: w.label, subtitle: w.text, to: w.to, items: w.items })} />)}</div></section>

    <section className="command-control-grid"><ControlCard title="Dispatch Command" count={groups.dispatch.length} text="Crew assignment and dispatch balancing." active={groups.dispatch.length > 0} onClick={() => openActionDrawer("Dispatch Command", "Assign or review unassigned jobs.", groups.dispatch)} /><ControlCard title="Revenue Command" count={groups.revenue.length} text="Invoices, pricing, and cashflow follow-through." active={groups.revenue.length > 0} onClick={() => openActionDrawer("Revenue Command", "Completed work ready for pricing or draft invoices.", groups.revenue)} /><ControlCard title="Proof-to-Paid" count={groups.proof.length} text="Proof packs required before payment chase." active={groups.proof.length > 0} onClick={() => openActionDrawer("Proof-to-Paid Command", "Completed jobs missing proof assets.", groups.proof)} /><ControlCard title="Follow-Up Command" count={groups.follow.length} text="Quote and invoice follow-up preparation." active={groups.follow.length > 0} onClick={() => openActionDrawer("Follow-Up Command", "Prepared invoice and quote follow-up work.", groups.follow)} /><ControlCard title="Team/Crew" count={data.workers.length} text="Team capacity and worker availability." active={data.workers.length > 0} onClick={() => openWorkspace({ title: "Team", subtitle: "Workers loaded from your business.", to: "/team", items: data.workers.slice(0, 8) })} /><ControlCard title="Account Health" count={data.health?.warnings?.length || 0} text="Plan, billing, and account risk warnings." active={Boolean(data.health?.warnings?.length)} onClick={() => openWorkspace({ title: "Account & Plan", subtitle: "Plans, billing, support, and legal access.", to: "/plans", items: [] })} /></section>

    <section className="command-panel command-account-centre"><div className="command-section-head"><div><p className="smart-command-kicker">Owner Account Centre</p><h2>Account, plan, settings and support</h2><p>Everything the owner needs for billing, settings, help, legal, notifications, and integrations from one place.</p></div></div><div className="command-account-grid"><MiniTile title="Account & Plan" text="Plan, billing, usage and limits" action={() => openWorkspace({ title: "Account & Plan", subtitle: "Plan, billing, limits and account health.", to: "/plans", items: [] })} /><MiniTile title="Plans / Billing" text="Choose or change plan" action={() => openWorkspace({ title: "Plans / Billing", subtitle: "Change plan or review billing.", to: "/plans", items: [] })} /><MiniTile title="Settings" text="Business setup" action={() => openWorkspace({ title: "Settings", subtitle: "Business setup and app settings.", to: "/settings", items: [] })} /><MiniTile title="Contact Us" text="Help and support" action={() => openWorkspace({ title: "Contact Us", subtitle: "Get help from Churvox support.", to: "/contact", items: [] })} /><MiniTile title="Notifications" text="Alerts and updates" action={() => openWorkspace({ title: "Notifications", subtitle: "Alerts and updates.", to: "/notifications", items: [] })} /><MiniTile title="Integrations" text="MYOB and tools" action={() => openWorkspace({ title: "Integrations", subtitle: "MYOB and connected tools.", to: "/integrations", items: [] })} /><MiniTile title="Privacy" text="Privacy policy" action={() => openWorkspace({ title: "Privacy", subtitle: "Privacy policy.", to: "/privacy", items: [] })} /><MiniTile title="Terms" text="Terms of use" action={() => openWorkspace({ title: "Terms", subtitle: "Terms of use.", to: "/terms", items: [] })} /><MiniTile title="Account Deletion" text="Delete account info" action={() => openWorkspace({ title: "Account Deletion", subtitle: "Account deletion information.", to: "/account-deletion", items: [] })} /></div></section>

    <section className="command-panel"><div className="command-section-head"><div><p className="smart-command-kicker">Zone 3 · Today’s run sheet</p><h2>Work moving today</h2></div></div>{runSheet.length ? <div className="command-run-list">{runSheet.map(job => <article key={idOf(job)}><b>{cleanJobTitle(job, data.clients)}</b><span>{clientNameFor(job, data.clients)} · {job.status || "open"}</span><button onClick={() => openJobEditor(idOf(job))}>Edit here</button></article>)}</div> : <div className="command-empty"><p>No jobs scheduled for today yet.</p><button onClick={() => routeTo("/jobs/new")}>Create Job</button></div>}</section>

    <section className="command-panel"><div className="command-section-head"><div><p className="smart-command-kicker">AI Approval Queue</p><h2>Grouped AI work</h2><p>Open a group and work inside the drawer.</p></div><span className="command-pill">{actions.length} ready</span></div><div className="command-filter-grid">{[["Approvals", actions], ["Dispatch", groups.dispatch], ["Revenue", groups.revenue], ["Follow-Ups", groups.follow], ["Proof", groups.proof], ["Reception", groups.reception], ["Recurring", groups.recurring], ["Updates", groups.update], ["Quote Builder", groups.quote_builder], ["Client Memory", groups.memory]].map(([label, items]) => <button key={label} className={items.length ? "active" : ""} onClick={() => openActionDrawer(label, `Focused ${label.toLowerCase()} work.`, items)}>{label}<span>{items.length} items</span></button>)}</div></section>

    <Drawer drawer={drawer} onClose={() => setDrawer(null)}>
      {drawer?.type === "ask" ? <div className="command-drawer-stack"><p><b>What I’d do first:</b> {best ? `${best.title}. ${best.reason}` : "Nothing urgent is blocking the business right now."}</p><div className="command-prompt-grid">{["What needs doing today?", "Which jobs need crew?", "What invoices need chasing?", "What should I do first?", "What proof packs are missing?"].map(q => <button key={q} onClick={() => setNotice(`${q} — Command is using live business counts for now.`)}>{q}</button>)}</div></div> : null}
      {drawer?.type === "actions" ? <div className="command-action-list">{drawer.items?.length ? drawer.items.map(action => <ActionCard key={`drawer-${action.id}`} action={action} onDismiss={dismissAction} onExecute={executeCommandAction} onOpenJobEditor={openJobEditor} />) : <div className="command-empty"><p>No work in this section right now.</p></div>}</div> : null}
      {drawer?.type === "workspace" ? <div className="command-drawer-stack">{drawer.items?.length ? drawer.items.map((item, idx) => <PreviewItem key={idOf(item) || idx} item={item} drawer={drawer} onJob={openJobEditor} onExecute={executeCommandAction} />) : <AccountWorkspace drawer={drawer} user={user} data={data} setNotice={setNotice} />}</div> : null}
      {drawer?.type === "runsheet" ? <div className="command-run-list">{drawer.items?.map(job => <article key={`drawer-job-${idOf(job)}`}><b>{cleanJobTitle(job, data.clients)}</b><span>{clientNameFor(job, data.clients)} · {job.status || "open"}</span><button onClick={() => openJobEditor(idOf(job))}>Edit here</button></article>)}</div> : null}
      {drawer?.type === "job" ? <JobEditor job={drawer.job} clients={data.clients} workers={data.workers} onSave={saveJobFromDrawer} onExecute={executeCommandAction} onClose={() => setDrawer(null)} /> : null}
    </Drawer>
  </div></main></Layout>;
}
