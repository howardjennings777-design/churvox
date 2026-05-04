import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import "../styles/smartCommandSystem.css";

const norm = (v) => String(v || "").toLowerCase().trim();
const idOf = (x) => String(x?.id || x?._id || x?.uuid || "");
const listFrom = (v, keys = []) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  for (const k of keys) if (Array.isArray(v[k])) return v[k];
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.items)) return v.items;
  return [];
};
const safeGet = async (path) => { try { return await get(path); } catch { return []; } };
const money = (v) => Number.isFinite(Number(v)) ? `$${Number(v).toFixed(2)}` : "amount unknown";
const canSeeCommand = (role) => ["owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"].includes(norm(role));
const openPath = (a) => a.job_id ? `/jobs/${a.job_id}` : a.invoice_id ? `/invoices/${a.invoice_id}` : a.quote_id ? `/quotes/${a.quote_id}` : a.client_id ? `/clients/${a.client_id}` : "/dashboard";

function clientName(job, clients) {
  const cid = String(job?.client_id || job?.clientId || job?.customer_id || "");
  const c = clients.find((x) => [x.id, x._id, x.client_id].map(String).includes(cid));
  return c?.name || c?.business_name || c?.company_name || job?.client_name || job?.customer_name || job?.title || "Client";
}

function titleForJob(job, clients) {
  const raw = String(job?.title || job?.name || job?.service_type || "").trim();
  const clean = raw && !raw.match(/^[a-f0-9-]{12,}$/i) ? raw : "Unassigned job";
  const client = clientName(job, clients);
  return clean === "Unassigned job" && client !== "Client" ? client : clean;
}

function buildActions(data, dismissed) {
  const actions = [];
  const jobs = data.jobs || [];
  const clients = data.clients || [];
  const invoices = data.invoices || [];
  const quotes = data.quotes || [];
  const proofPacks = data.proofPacks || [];
  const recurring = data.recurring || [];
  const receptionist = data.receptionist || [];
  const customerUpdates = data.customerUpdates || [];
  const quoteDrafts = data.quoteDrafts || [];
  const memory = data.memory || [];
  const invoiceJobIds = new Set(invoices.map((i) => String(i.job_id || i.jobId || "")).filter(Boolean));

  jobs.forEach((job) => {
    const jid = idOf(job);
    if (!jid) return;
    const status = norm(job.status);
    const closed = ["completed", "complete", "cancelled", "canceled", "archived"].includes(status);
    const assigned = job.assigned_worker_id || job.worker_id || job.assigned_worker;
    const label = titleForJob(job, clients);
    const client = clientName(job, clients);
    if (!assigned && !closed) actions.push({
      id: `dispatch-${jid}`, type: "dispatch", priority: "high", title: `Assign crew to ${label}`,
      summary: `Client: ${client}. This job has no worker assigned.`, reason: "Unassigned jobs block the day’s schedule.",
      next: "Open the job or dispatch queue and assign the right worker.", job_id: jid, source: "generated", executable: false
    });
    if (["completed", "complete"].includes(status) && !job.invoice_id && !job.draft_invoice_id && !invoiceJobIds.has(jid)) {
      const amount = job.fixed_price ?? job.price ?? job.subtotal ?? job.amount;
      const priced = Number.isFinite(Number(amount)) && Number(amount) > 0;
      actions.push({
        id: `invoice-${jid}`, type: priced ? "invoice" : "pricing", priority: priced ? "medium" : "high",
        title: priced ? `Create draft invoice for ${label}` : `Add pricing for ${label}`,
        summary: priced ? `Suggested amount source: ${money(amount)}.` : "Completed job has no safe price source yet.",
        reason: priced ? "Completed work is ready to turn into a draft invoice." : "Churvox must not create a $0 invoice.",
        next: priced ? "Create a draft invoice only. Do not send, charge, or sync MYOB." : "Open the job and add pricing first.",
        job_id: jid, source: "generated", executable: false
      });
      const hasProof = job.proof_pack_id || job.proof_pack_ready || proofPacks.some((p) => String(p.job_id || p.jobId || "") === jid);
      if (!hasProof) actions.push({
        id: `proof-${jid}`, type: "proof", priority: "medium", title: `Prepare proof pack for ${label}`,
        summary: "Completed job needs proof before payment follow-up.", reason: "Proof-to-Paid needs customer-ready proof assets.",
        next: "Prepare a proof pack for owner review.", job_id: jid, source: "generated", executable: true
      });
    }
  });

  invoices.forEach((i) => {
    const iid = idOf(i); if (!iid) return;
    const s = norm(i.status);
    if (["sent", "open", "overdue", "unpaid", "pending_payment"].includes(s)) actions.push({
      id: `inv-follow-${iid}`, type: "follow", priority: s === "overdue" ? "high" : "medium",
      title: `Prepare reminder for invoice ${i.invoice_number || i.number || iid.slice(-6)}`,
      summary: `${money(i.balance_due ?? i.balance ?? i.amount_due ?? i.total ?? i.amount)} outstanding.`,
      reason: "Invoice is still waiting on payment.", next: "Prepare/copy reminder. Do not fake send.", invoice_id: iid, source: "generated", executable: false
    });
  });

  quotes.forEach((q) => {
    const qid = idOf(q); if (!qid) return;
    if (["sent", "pending", "waiting", "viewed", "draft"].includes(norm(q.status))) actions.push({
      id: `quote-follow-${qid}`, type: "follow", priority: "medium", title: `Follow up quote ${q.quote_number || q.number || qid.slice(-6)}`,
      summary: "Quote is waiting for a customer decision.", reason: "Follow-up can help convert quoted work.",
      next: "Prepare/copy a follow-up. Do not auto-send.", quote_id: qid, source: "generated", executable: false
    });
  });

  receptionist.forEach((e) => actions.push({ id: `reception-${idOf(e) || e.customer_email || e.customer_phone}`, type: "reception", priority: "high", title: e.customer_name ? `Review enquiry from ${e.customer_name}` : "Review new enquiry", summary: e.message || e.ai_summary || "New enquiry needs review.", reason: "AI Receptionist can prepare a client, job, or quote.", next: "Review enquiry and convert safely.", client_id: e.suggested_client_id, source: "generated", executable: false }));
  recurring.forEach((r) => actions.push({ id: `recurring-${idOf(r) || r.client_id || r.title}`, type: "recurring", priority: "medium", title: r.title || "Recurring work due", summary: r.service_type || "Recurring run needs review.", reason: "Recurring work is ready to prepare.", next: "Review and create due jobs without duplicates.", source: "generated", executable: false }));
  customerUpdates.forEach((u) => actions.push({ id: `update-${idOf(u) || u.job_id || u.type}`, type: "update", priority: "low", title: u.type ? `Customer update: ${u.type}` : "Customer update ready", summary: u.message || "Customer update draft ready.", reason: "Customer update needs owner approval.", next: "Approve/copy only. Do not expose GPS/private data.", job_id: u.job_id, source: "generated", executable: false }));
  quoteDrafts.forEach((q) => actions.push({ id: `quote-draft-${idOf(q) || q.client_id || q.description}`, type: "quote_builder", priority: "medium", title: q.title || "Quote draft ready", summary: q.ai_scope_summary || q.description || "Quote draft needs review.", reason: "Quote draft can be reviewed and converted.", next: "Review before creating/sending quote.", quote_id: q.converted_quote_id, source: "generated", executable: false }));
  memory.forEach((m) => actions.push({ id: `memory-${idOf(m) || m.client_id || m.title}`, type: "memory", priority: "low", title: m.title || "Client memory suggestion", summary: m.summary || m.suggested_next_action || "Client history suggests a next step.", reason: "Client/property memory found a useful action.", next: "Open client or prepare a safe follow-up.", client_id: m.client_id, source: "generated", executable: false }));

  const unique = new Map();
  actions.forEach((a) => { if (a.id && !dismissed[a.id] && !unique.has(a.id)) unique.set(a.id, a); });
  return [...unique.values()];
}

function ActionCard({ action, onApprove, onDismiss }) {
  const canApprove = action.executable || action.source === "backend";
  return <article className="smart-command-row">
    <div className="smart-command-badges"><span className="smart-command-badge">{action.priority}</span><span className="smart-command-badge type">{action.type}</span></div>
    <p className="smart-command-row-title">{action.title}</p>
    <p className="smart-command-row-text">{action.summary}</p>
    <p className="smart-command-row-text"><b>Why AI picked this:</b> {action.reason}</p>
    <p className="smart-command-row-text"><b>What happens next:</b> {action.next}</p>
    <div className="smart-command-actions">
      <button type="button" className={`smart-command-btn ${canApprove ? "green" : "light"}`} onClick={() => onApprove(action)}>{canApprove ? "Approve" : "Review"}</button>
      <button type="button" className="smart-command-btn light" onClick={() => { window.location.assign(openPath(action)); }}>Open</button>
      <button type="button" className="smart-command-btn light" onClick={() => onDismiss(action)}>Dismiss</button>
    </div>
  </article>;
}

export default function CommandHubPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("approvals");
  const [dismissed, setDismissed] = useState({});
  const [data, setData] = useState({ jobs: [], clients: [], invoices: [], quotes: [], proofPacks: [], recurring: [], receptionist: [], customerUpdates: [], quoteDrafts: [], memory: [], health: {} });

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [jobs, clients, invoices, quotes, proofPacks, recurring, receptionist, customerUpdates, quoteDrafts, memory, health] = await Promise.all([
        safeGet("/jobs"), safeGet("/clients"), safeGet("/invoices"), safeGet("/quotes"), safeGet("/proof-packs"), safeGet("/api/ai/recurring"), safeGet("/api/ai/receptionist/enquiries"), safeGet("/api/ai/customer-updates"), safeGet("/api/ai/quotes/drafts"), safeGet("/api/ai/client-memory"), safeGet("/api/ai/operator/business-health")
      ]);
      setData({
        jobs: listFrom(jobs, ["jobs"]), clients: listFrom(clients, ["clients"]), invoices: listFrom(invoices, ["invoices"]), quotes: listFrom(quotes, ["quotes"]), proofPacks: listFrom(proofPacks, ["proof_packs", "items"]), recurring: listFrom(recurring, ["rules", "items"]), receptionist: listFrom(receptionist, ["enquiries", "items"]), customerUpdates: listFrom(customerUpdates, ["updates", "items"]), quoteDrafts: listFrom(quoteDrafts, ["drafts", "items"]), memory: listFrom(memory, ["items", "actions"]), health: health || {}
      });
    } catch (e) { setError("Command could not load business data yet."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const actions = useMemo(() => buildActions(data, dismissed), [data, dismissed]);
  const groups = useMemo(() => ({
    dispatch: actions.filter((a) => a.type === "dispatch"),
    revenue: actions.filter((a) => ["invoice", "pricing"].includes(a.type)),
    proof: actions.filter((a) => a.type === "proof"),
    follow: actions.filter((a) => a.type === "follow"),
    reception: actions.filter((a) => a.type === "reception"),
    recurring: actions.filter((a) => a.type === "recurring"),
    update: actions.filter((a) => a.type === "update"),
    quote_builder: actions.filter((a) => a.type === "quote_builder"),
    memory: actions.filter((a) => a.type === "memory"),
  }), [actions]);
  const best = groups.dispatch[0] || groups.revenue[0] || groups.proof[0] || groups.follow[0] || actions[0];

  const runAction = async (fn, success) => { setNotice(""); setError(""); try { await fn(); setNotice(success); await load(); } catch (e) { setError(String(e?.message || "Action failed.")); } };
  const approve = (a) => {
    if (a.source === "backend") return runAction(() => post(`/ai-operator/actions/${a.id}/approve`, {}), "Action approved.");
    if (a.type === "proof" && a.job_id) return runAction(() => post(`/proof-packs/prepare-for-job/${a.job_id}`, {}), "Proof pack preparation started.");
    window.location.assign(openPath(a));
  };
  const dismiss = (a) => a.source === "backend" ? runAction(() => post(`/ai-operator/actions/${a.id}/dismiss`, {}), "Action dismissed.") : setDismissed((p) => ({ ...p, [a.id]: true }));
  const runAiPlan = () => runAction(() => post("/smart-hub/scan", {}), "AI plan ran. Command refreshed.");

  if (!canSeeCommand(user?.role)) return <Layout><main className="smart-command-system"><section className="smart-command-panel"><h2>Command is owner/manager/office admin only.</h2></section></main></Layout>;

  const sectionTiles = [
    ["Approvals", "approvals", actions.length], ["Dispatch", "dispatch", groups.dispatch.length], ["Revenue", "revenue", groups.revenue.length], ["Proof-to-Paid", "proof", groups.proof.length], ["Follow-Ups", "follow", groups.follow.length], ["Reception", "reception", groups.reception.length], ["Recurring", "recurring", groups.recurring.length], ["Updates", "update", groups.update.length], ["Quote Builder", "quote_builder", groups.quote_builder.length], ["Client Memory", "memory", groups.memory.length]
  ];
  const activeList = tab === "approvals" ? actions : (groups[tab] || []);

  return <Layout smartHubMode><main className="smart-command-system"><div className="smart-command-shell">
    <section className="smart-command-hero"><div className="smart-command-hero-grid"><div className="smart-command-logo-wrap"><ChurvoxLogo size="hero" /></div><div><p className="smart-command-kicker">Smart Hub</p><h1 className="smart-command-title">AI Operator Command Dashboard</h1><p className="smart-command-subtitle">AI scans your business, prepares the work, and waits for owner approval.</p></div><div className="smart-command-next-card"><p className="smart-command-kicker">Today</p><strong>AI Actions: {actions.length}</strong><strong>Approval queue: {actions.length}</strong><div className="smart-command-actions"><button className="smart-command-btn dark" onClick={runAiPlan}>Run AI plan</button><button className="smart-command-btn light" onClick={() => setTab("approvals")}>Open queue</button></div></div></div></section>
    {notice ? <section className="smart-command-panel"><p>{notice}</p></section> : null}{error ? <section className="smart-command-panel"><p>{error}</p></section> : null}{loading ? <section className="smart-command-panel"><p>Loading Command...</p></section> : null}
    <section className="smart-command-dual-grid"><article className="smart-command-panel accent"><p className="smart-command-kicker">Business Engine Summary</p><h2>Command found {actions.length} things to handle today.</h2><ul className="smart-command-summary-list"><li>{groups.dispatch.length} jobs need crew</li><li>{groups.revenue.length} revenue items need review</li><li>{groups.follow.length} follow-ups are ready</li><li>{groups.proof.length} proof packs need preparing</li><li>{groups.recurring.length} recurring items are due</li></ul><p>Owner approval is required before Churvox executes.</p></article><article className="smart-command-panel smart-command-priority"><p className="smart-command-kicker">Best next move</p><h2>{best ? best.title : "Business is clear"}</h2><p>{best ? best.reason : "No urgent Command actions found."}</p><button className="smart-command-btn primary" onClick={() => setTab(best?.type === "dispatch" ? "dispatch" : best?.type === "follow" ? "follow" : best?.type === "proof" ? "proof" : "approvals")}>Open Command Queue</button></article></section>
    <section className="smart-command-control-grid">{[["Dispatch Command", groups.dispatch.length, "Jobs needing crew", "dispatch"], ["Revenue Command", groups.revenue.length, "Invoices, pricing, and money waiting", "revenue"], ["Proof-to-Paid Command", groups.proof.length, "Completed work needing proof", "proof"], ["Follow-Up Command", groups.follow.length, "Quotes and invoice reminders", "follow"], ["Team/Crew", data.workers?.length || 0, "Workers and workload", "dispatch"], ["Account Health", data.health?.warnings?.length || 0, "Plan and account warnings", "account"]].map(([name, count, text, key]) => <article key={name} className={`smart-command-panel smart-command-control ${count ? "" : "muted"}`}><h3>{name}</h3><p className="smart-command-big-count">{count}</p><p>{text}</p><button className="smart-command-btn light" onClick={() => key === "account" ? window.location.assign("/plans") : setTab(key)}>Open</button></article>)}</section>
    <section className="smart-command-panel"><div className="smart-command-panel-head"><div><p className="smart-command-kicker">Priority Actions</p><h2>Command Work Queue</h2><p>Top urgent actions are always visible.</p></div><span className="smart-command-queue-count">{Math.min(5, actions.length)} live</span></div><div className="smart-command-list">{actions.slice(0, 5).map((a) => <ActionCard key={a.id} action={a} onApprove={approve} onDismiss={dismiss} />)}{!actions.length ? <p>No Command actions right now.</p> : null}</div></section>
    <section className="smart-command-panel"><p className="smart-command-kicker">Command Sections</p><h2>Business Workspaces</h2><div className="smart-command-dock">{sectionTiles.map(([name, key, count]) => <button key={key} type="button" onClick={() => setTab(key)}>{name}<span>{count} items</span></button>)}</div></section>
    <section className="smart-command-panel"><h2>{sectionTiles.find((s) => s[1] === tab)?.[0] || "Approvals"}</h2><div className="smart-command-list">{activeList.map((a) => <ActionCard key={`section-${a.id}`} action={a} onApprove={approve} onDismiss={dismiss} />)}{!activeList.length ? <div className="smart-command-empty"><p>No work in this section. Command is focused on the active sections above.</p><div className="smart-command-actions"><button className="smart-command-btn light" onClick={() => setTab("approvals")}>Open Approvals</button><button className="smart-command-btn light" onClick={runAiPlan}>Run AI Plan</button></div></div> : null}</div></section>
  </div></main></Layout>;
}
