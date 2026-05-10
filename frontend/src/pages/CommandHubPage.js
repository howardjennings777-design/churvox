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

const ROUTES = {
  jobs: "/jobs", clients: "/clients", quotes: "/quotes", invoices: "/invoices", team: "/team", dispatch: "/dispatch", proof: "/proof-to-paid", account: "/plans", settings: "/settings"
};
const WORKSPACES = [
  ["Jobs", ROUTES.jobs], ["Clients", ROUTES.clients], ["Quotes", ROUTES.quotes], ["Invoices", ROUTES.invoices], ["Team", ROUTES.team], ["Dispatch", ROUTES.dispatch], ["Proof-to-Paid", ROUTES.proof], ["Account & Plan", ROUTES.account], ["Settings", ROUTES.settings]
];

function clientName(job, clients) { const cid = String(job?.client_id || job?.clientId || job?.customer_id || ""); const c = clients.find((x) => [x.id, x._id, x.client_id].map(String).includes(cid)); return c?.name || c?.business_name || c?.company_name || job?.client_name || job?.customer_name || job?.title || "Client"; }
function titleForJob(job, clients) { const raw = String(job?.title || job?.name || job?.service_type || "").trim(); const clean = raw && !raw.match(/^[a-f0-9-]{12,}$/i) ? raw : "Unassigned job"; const client = clientName(job, clients); return clean === "Unassigned job" && client !== "Client" ? client : clean; }
const workerName = (job, workers = []) => {
  const workerId = String(job?.assigned_worker_id || job?.worker_id || "");
  const direct = typeof job?.assigned_worker === "string" ? job.assigned_worker : "";
  if (direct) return direct;
  const found = workers.find((w) => [w.id, w._id, w.worker_id].map(String).includes(workerId));
  return found?.name || found?.full_name || found?.display_name || "Unassigned";
};
const isToday = (v) => {
  if (!v) return false;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return false;
  const t = new Date();
  return d.getUTCFullYear() === t.getUTCFullYear() && d.getUTCMonth() === t.getUTCMonth() && d.getUTCDate() === t.getUTCDate();
};

function buildActions(data, dismissed) {
  const actions = [];
  const { jobs = [], clients = [], invoices = [], quotes = [], proofPacks = [], recurring = [], receptionist = [], customerUpdates = [], quoteDrafts = [], memory = [] } = data;
  const invoiceJobIds = new Set(invoices.map((i) => String(i.job_id || i.jobId || "")).filter(Boolean));
  jobs.forEach((job) => {
    const jid = idOf(job); if (!jid) return;
    const status = norm(job.status); const closed = ["completed", "complete", "cancelled", "canceled", "archived"].includes(status);
    const assigned = job.assigned_worker_id || job.worker_id || job.assigned_worker; const label = titleForJob(job, clients); const client = clientName(job, clients);
    if (!assigned && !closed) actions.push({ id: `dispatch-${jid}`, type: "dispatch", priority: "high", title: `Assign crew to ${label}`, summary: `Client: ${client}. This job has no worker assigned.`, reason: "Unassigned jobs block the day’s schedule.", next: "Review or open dispatch and assign the right worker.", job_id: jid, source: "generated", executable: false });
    if (["completed", "complete"].includes(status) && !job.invoice_id && !job.draft_invoice_id && !invoiceJobIds.has(jid)) {
      const amount = job.fixed_price ?? job.price ?? job.subtotal ?? job.amount; const priced = Number.isFinite(Number(amount)) && Number(amount) > 0;
      actions.push({ id: `invoice-${jid}`, type: priced ? "invoice" : "pricing", priority: priced ? "medium" : "high", title: priced ? `Create draft invoice for ${label}` : `Add pricing for ${label}`, summary: priced ? `Suggested amount source: ${money(amount)}.` : "Completed job has no safe price source yet.", reason: priced ? "Completed work is ready to turn into a draft invoice." : "Churvox must not create a $0 invoice.", next: priced ? "Review and open invoice drafting. Do not auto-send or auto-charge." : "Open the job and add pricing first.", job_id: jid, source: "generated", executable: false });
      const hasProof = job.proof_pack_id || job.proof_pack_ready || proofPacks.some((p) => String(p.job_id || p.jobId || "") === jid);
      if (!hasProof) actions.push({ id: `proof-${jid}`, type: "proof", priority: "medium", title: `Prepare proof pack for ${label}`, summary: "Completed job needs proof before payment follow-up.", reason: "Proof-to-Paid needs customer-ready proof assets.", next: "Prepare proof pack for owner review.", job_id: jid, source: "generated", executable: true });
    }
  });
  invoices.forEach((i) => { const iid = idOf(i); if (!iid) return; const s = norm(i.status); if (["sent", "open", "overdue", "unpaid", "pending_payment"].includes(s)) actions.push({ id: `inv-follow-${iid}`, type: "follow", priority: s === "overdue" ? "high" : "medium", title: `Prepare reminder for invoice ${i.invoice_number || i.number || iid.slice(-6)}`, summary: `${money(i.balance_due ?? i.balance ?? i.amount_due ?? i.total ?? i.amount)} outstanding.`, reason: "Invoice is still waiting on payment.", next: "Prepare/copy reminder. Do not fake send.", invoice_id: iid, source: "generated", executable: false }); });
  quotes.forEach((q) => { const qid = idOf(q); if (!qid) return; if (["sent", "pending", "waiting", "viewed", "draft"].includes(norm(q.status))) actions.push({ id: `quote-follow-${qid}`, type: "follow", priority: "medium", title: `Follow up quote ${q.quote_number || q.number || qid.slice(-6)}`, summary: "Quote is waiting for a customer decision.", reason: "Follow-up can help convert quoted work.", next: "Prepare/copy follow-up. Do not auto-send.", quote_id: qid, source: "generated", executable: false }); });

  const unique = new Map();
  [...actions, ...receptionist.map((e) => ({ id: `reception-${idOf(e) || e.customer_email || e.customer_phone}`, type: "reception", priority: "high", title: e.customer_name ? `Review enquiry from ${e.customer_name}` : "Review new enquiry", summary: e.message || e.ai_summary || "New enquiry needs review.", reason: "AI Receptionist can prepare a client, job, or quote.", next: "Review enquiry and convert safely.", client_id: e.suggested_client_id, source: "generated", executable: false }))].forEach((a) => { if (a.id && !dismissed[a.id] && !unique.has(a.id)) unique.set(a.id, a); });
  return [...unique.values()];
}

function ActionCard({ action, onPrimary, onDismiss }) {
  const primaryLabel = action.executable ? "Prepare Proof" : action.type === "follow" ? "Prepare/Copy" : "Review";
  return <article className="smart-command-row"><div className="smart-command-badges"><span className="smart-command-badge">{action.priority}</span><span className="smart-command-badge type">{action.type}</span></div><p className="smart-command-row-title">{action.title}</p><p className="smart-command-row-text">{action.summary}</p><p className="smart-command-row-text"><b>Why Command picked this:</b> {action.reason}</p><p className="smart-command-row-text"><b>What happens next:</b> {action.next}</p><div className="smart-command-actions"><button type="button" className="smart-command-btn light" onClick={() => onPrimary(action)}>{primaryLabel}</button><button type="button" className="smart-command-btn light" onClick={() => { window.location.assign(openPath(action)); >Open</button><button type="button" className="smart-command-btn light" onClick={() => onDismiss(action)}>Dismiss</button></div></article>;
}

export default function CommandHubPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true); const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  const [tab, setTab] = useState("today"); const [queueOpen, setQueueOpen] = useState(false); const [dismissed, setDismissed] = useState({});
  const [data, setData] = useState({ jobs: [], clients: [], invoices: [], quotes: [], proofPacks: [], workers: [], health: {} });

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [jobs, clients, invoices, quotes, proofPacks, workers, health] = await Promise.all([
        safeGet("/jobs"), safeGet("/clients"), safeGet("/invoices"), safeGet("/quotes"), safeGet("/proof-packs"), safeGet("/team/workers"), safeGet("/api/ai/operator/business-health")
      ]);
      setData({ jobs: listFrom(jobs, ["jobs"]), clients: listFrom(clients, ["clients"]), invoices: listFrom(invoices, ["invoices"]), quotes: listFrom(quotes, ["quotes"]), proofPacks: listFrom(proofPacks, ["proof_packs", "items"]), workers: listFrom(workers, ["workers", "items"]), health: health || {} });
    } catch { setError("Command could not load business data yet."); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const actions = useMemo(() => buildActions(data, dismissed), [data, dismissed]);
  const groups = useMemo(() => ({ dispatch: actions.filter((a) => a.type === "dispatch"), revenue: actions.filter((a) => ["invoice", "pricing"].includes(a.type)), proof: actions.filter((a) => a.type === "proof"), follow: actions.filter((a) => a.type === "follow") }), [actions]);
  const best = groups.dispatch[0] || groups.revenue[0] || groups.proof[0] || groups.follow[0] || actions[0];
  const sectionTiles = [["Approvals", "approvals", actions.length], ["Dispatch", "dispatch", groups.dispatch.length], ["Revenue", "revenue", groups.revenue.length], ["Proof-to-Paid", "proof", groups.proof.length], ["Follow-Ups", "follow", groups.follow.length]];
  const activeList = tab === "approvals" ? actions : (groups[tab] || []);
  const todayJobs = useMemo(() => data.jobs.filter((j) => isToday(j.scheduled_date || j.start_date || j.due_date || j.date) || ["in_progress", "active", "scheduled", "assigned"].includes(norm(j.status))).slice(0, 6), [data.jobs]);

  const runAction = async (fn, success) => { setNotice(""); setError(""); try { await fn(); setNotice(success); await load(); } catch (e) { setError(String(e?.message || "Action failed.")); } };
  const onPrimary = (a) => a.executable && a.type === "proof" && a.job_id ? runAction(() => post(`/proof-packs/prepare-for-job/${a.job_id}`, {}), "Proof pack preparation started.") : window.location.assign(openPath(a));
  const dismiss = (a) => setDismissed((p) => ({ ...p, [a.id]: true }));
  const runAiPlan = () => runAction(() => post("/smart-hub/scan", {}), "AI plan ran. Command refreshed.");

  if (!canSeeCommand(user?.role)) return <Layout><main className="smart-command-system"><section className="smart-command-panel"><h2>Command is owner/manager/office admin only.</h2></section></main></Layout>;

  return <Layout smartHubMode><main className="smart-command-system"><div className="smart-command-shell">
    <section className="smart-command-hero"><div className="smart-command-hero-grid"><div className="smart-command-logo-wrap"><ChurvoxLogo size="hero" /></div><div><p className="smart-command-kicker">Smart Hub</p><h1 className="smart-command-title">Churvox Command Hub</h1><p className="smart-command-subtitle">Control Jobs, Clients, Quotes, Invoices, Team, Dispatch, Proof-to-Paid, and account operations.</p></div><div className="smart-command-next-card"><p className="smart-command-kicker">Today</p><strong>Actions to review: {actions.length}</strong><strong>Workers active: {data.workers.length}</strong><div className="smart-command-actions"><button className="smart-command-btn dark" onClick={runAiPlan}>Run AI plan</button><button className="smart-command-btn light" onClick={() => { setTab("approvals"); setQueueOpen(true); >Open queue</button></div></div></div></section>

    <section className="smart-command-panel"><p className="smart-command-kicker">Main Hub</p><h2>Run the whole business from here</h2><p>Use these when you already know where you want to go. Use Command when you want AI to tell you what needs attention.</p><div className="smart-command-dock smart-command-main-hub">{WORKSPACES.map(([name, path]) => <button key={name} type="button" onClick={() => window.location.assign(path)}>{name}<span>Open workspace</span></button>)}</div></section>

    <section className="smart-command-dual-grid"><article className="smart-command-panel accent"><p className="smart-command-kicker">Business Engine Summary</p><h2>Command found {actions.length} things to handle today.</h2><ul className="smart-command-summary-list"><li>{groups.dispatch.length} jobs needing crew</li><li>{groups.revenue.length} revenue items</li><li>{groups.follow.length} follow-ups ready</li><li>{groups.proof.length} proof packs</li><li>{data.workers.length} workers active</li></ul></article><article className="smart-command-panel smart-command-priority"><p className="smart-command-kicker">Best next move</p><h2>{best ? best.title : "Business is clear"}</h2><p>{best ? best.reason : "No urgent Command actions found."}</p><button className="smart-command-btn primary" onClick={() => setTab(best?.type === "dispatch" ? "dispatch" : best?.type === "follow" ? "follow" : best?.type === "proof" ? "proof" : "approvals")}>Open recommended section</button></article></section>

    <section className="smart-command-panel"><p className="smart-command-kicker">Today’s Run Sheet</p><h2>Today’s jobs and active field work</h2><div className="smart-command-list">{todayJobs.length ? todayJobs.map((job) => <article key={idOf(job)} className="smart-command-row"><p className="smart-command-row-title">{titleForJob(job, data.clients)}</p><p className="smart-command-row-text"><b>Client:</b> {clientName(job, data.clients)} · <b>Status:</b> {job.status || "scheduled"}</p><p className="smart-command-row-text"><b>Worker:</b> {workerName(job, data.workers)} · <b>Location:</b> {job.address || job.suburb || "Address not added"}</p><div className="smart-command-actions"><button className="smart-command-btn light" onClick={() => window.location.assign(`/jobs/${idOf(job)}`)}>Open Job</button></div></article>) : <div className="smart-command-empty"><p>No jobs scheduled for today yet.</p><div className="smart-command-actions"><button className="smart-command-btn light" onClick={() => window.location.assign("/jobs/new")}>Create Job</button><button className="smart-command-btn light" onClick={() => window.location.assign(ROUTES.jobs)}>Open Jobs</button><button className="smart-command-btn light" onClick={() => window.location.assign(ROUTES.dispatch)}>Open Dispatch</button></div></div>}</div></section>

    <section className="smart-command-control-grid">{[["Dispatch Command", groups.dispatch.length, `${groups.dispatch.length} jobs need crew`, "Assign workers before the day gets blocked.", "dispatch"], ["Revenue Command", groups.revenue.length, groups.revenue.length ? "Money is waiting to move." : "No completed jobs are waiting for invoice right now.", "Keep cashflow moving from completed work.", "revenue"], ["Proof-to-Paid", groups.proof.length, groups.proof.length ? "Completed jobs need proof before payment follow-up." : "No proof packs needed right now.", "Lock in trust before chasing payment.", "proof"], ["Follow-Up Command", groups.follow.length, `${groups.follow.length} follow-ups ready`, "Keep quotes and invoices moving.", "follow"], ["Team/Crew", data.workers.length, `${data.workers.length} workers active`, "Crew capacity and availability.", "team"], ["Account Health", data.health?.warnings?.length || 0, (data.health?.warnings?.length || 0) ? `${data.health?.warnings?.length} account warnings need review.` : "No account warnings.", "Plan, billing, and account risk warnings.", "account"]].map(([name, count, headline, text, key]) => <article key={name} className={`smart-command-panel smart-command-control ${count ? "" : "muted"}`}><h3>{name}</h3><p className="smart-command-big-count">{count}</p><p><b>{headline}</b></p><p>{text}</p><button className="smart-command-btn light" onClick={() => ["dispatch", "revenue", "proof", "follow"].includes(key) ? setTab(key) : window.location.assign(key === "team" ? ROUTES.team : ROUTES.account)}>Open</button></article>)}</section>

    <section className="smart-command-dual-grid"><article className="smart-command-panel accent"><p className="smart-command-kicker">Owner Next Moves</p><h2>What should I do first?</h2><div className="smart-command-list">{[{ title: `Dispatch: ${groups.dispatch.length} jobs need crew`, reason: "Assign workers now to avoid schedule blockers.", action: () => setTab("dispatch") }, { title: `Follow-Up: ${groups.follow.length} reminders ready`, reason: "Keep quotes and invoices moving today.", action: () => setTab("follow") }, { title: `Team: ${data.workers.length} workers active`, reason: "Check capacity before adding more jobs.", action: () => window.location.assign(ROUTES.team) }].map((m) => <article key={m.title} className="smart-command-row"><p className="smart-command-row-title">{m.title}</p><p className="smart-command-row-text">{m.reason}</p><div className="smart-command-actions"><button className="smart-command-btn light" onClick={m.action}>Open</button></div></article>)}</div></article><article className="smart-command-panel smart-command-collapsed-queue"><div className="smart-command-panel-head"><div><p className="smart-command-kicker">Priority Actions</p><h2>Command Work Queue</h2><p>Collapsed by default so the hub stays clean.</p></div><span className="smart-command-queue-count">{actions.length} ready</span></div><div className="smart-command-actions"><button className="smart-command-btn primary" onClick={() => { setTab("approvals"); setQueueOpen(true); >Open Command Work Queue</button></div></article></section>

    {queueOpen ? <section className="smart-command-panel"><div className="smart-command-panel-head"><div><p className="smart-command-kicker">Priority Actions</p><h2>Command Work Queue</h2><p>Review generated actions and open each workspace safely.</p></div><div className="smart-command-actions"><button className="smart-command-btn light" onClick={() => { setTab("approvals"); setQueueOpen(true); >View all approvals</button><button className="smart-command-btn light" onClick={() => setQueueOpen(false)}>Collapse queue</button></div></div><div className="smart-command-list">{actions.slice(0, 5).map((a) => <ActionCard key={a.id} action={a} onPrimary={onPrimary} onDismiss={dismiss} />)}{!actions.length ? <p>No Command actions right now.</p> : null}</div></section> : null}

    <section className="smart-command-panel"><p className="smart-command-kicker">Command Filters</p><h2>Command Filters</h2><p>Open a focused view of the work Command found.</p><div className="smart-command-dock">{sectionTiles.map(([name, key, count]) => <button key={key} type="button" onClick={() => { setTab(key); setQueueOpen(false); >{name}<span>{count} items</span></button>)}</div></section>
    {tab !== "today" ? <section className="smart-command-panel"><h2>{sectionTiles.find((s) => s[1] === tab)?.[0] || "Approvals"}</h2><div className="smart-command-list">{activeList.map((a) => <ActionCard key={`section-${a.id}`} action={a} onPrimary={onPrimary} onDismiss={dismiss} />)}{!activeList.length ? <div className="smart-command-empty"><p>{tab === "proof" ? "No Proof-to-Paid work right now. Completed jobs with missing proof will appear here." : `No ${tab} work right now. New items will appear here when Command finds them.`}</p><div className="smart-command-actions"><button className="smart-command-btn light" onClick={() => window.location.assign(tab === "dispatch" ? ROUTES.dispatch : tab === "follow" ? ROUTES.quotes : tab === "revenue" ? ROUTES.invoices : ROUTES.jobs)}>Open related workspace</button></div></div> : null}</div></section> : null}
  </div></main></Layout>;
}
