import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import "../styles/smartCommandSystem.css";

const norm = (v) => String(v || "").toLowerCase().trim();
const idOf = (obj) => String(obj?.id || obj?._id || obj?.uuid || "");
const toList = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of keys) if (Array.isArray(value[key])) return value[key];
  return Array.isArray(value.data) ? value.data : [];
};
const safeGet = async (path) => { try { return await get(path); } catch { return []; } };
const roleAllowed = (role) => ["owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"].includes(norm(role));
const isDone = (action) => ["completed", "dismissed", "rejected", "done", "failed"].includes(norm(action?.status));
const moneyText = (n) => (Number.isFinite(Number(n)) ? `$${Number(n).toFixed(2)}` : "Unknown");
const hasProofPackForJob = (proofPacks, jobId) => proofPacks.some((p) => String(p?.job_id || p?.jobId || "") === String(jobId));

const TYPE_LABELS = {
  dispatch: "Dispatch",
  invoice_assistant: "Invoices",
  proof_to_paid: "Proof-to-Paid",
  follow_up: "Follow-Ups",
  receptionist: "Receptionist",
  recurring: "Recurring",
  customer_update: "Customer Updates",
  quote_builder: "Quote Builder",
  client_memory: "Client Memory",
  missing_pricing: "Pricing",
};

const actionCanExecute = (a) => a.source === "backend" || (a.type === "proof_to_paid" && a.job_id);
const actionPrimaryLabel = (a) => (actionCanExecute(a) ? "Approve" : "Review");
const relatedPath = (a) => a?.job_id ? `/jobs/${a.job_id}` : a?.invoice_id ? `/invoices/${a.invoice_id}` : a?.quote_id ? `/quotes/${a.quote_id}` : a?.client_id ? `/clients/${a.client_id}` : "/smart-hub/brain";

function ActionRow({ item, buttons = [] }) {
  return <article className="smart-command-row"><div className="smart-command-badges"><span className="smart-command-badge">{item.priority}</span><span className="smart-command-badge type">{TYPE_LABELS[item.type] || item.type}</span></div><p className="smart-command-row-title">{item.title}</p>{item.subtitle ? <p className="smart-command-row-text">{item.subtitle}</p> : null}<p className="smart-command-row-text">{item.summary}</p><div className="smart-command-actions">{buttons.map((button) => <button key={button.label} type="button" className={`smart-command-btn ${button.variant || "light"}`} onClick={button.onClick}>{button.label}</button>)}</div></article>;
}

export default function SmartHubBrainPageStable() {
  const { user } = useAuth();
  const [tab, setTab] = useState("queue");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [dismissedGenerated, setDismissedGenerated] = useState({});
  const [data, setData] = useState({ actions: [], jobs: [], invoices: [], quotes: [], proofPacks: [], followUps: [], recurring: [], receptionist: [], customerUpdates: [], quoteDrafts: [], health: {}, clients: [], workers: [], memory: [] });

  const load = async () => {
    setLoading(true);
    try {
      const [actions, jobs, invoices, quotes, proofPacks, followUps, recurring, receptionist, customerUpdates, quoteDrafts, health, clients, workers, memory] = await Promise.all([
        safeGet("/ai-operator/actions"), safeGet("/jobs"), safeGet("/invoices"), safeGet("/quotes"), safeGet("/proof-packs"), safeGet("/api/ai/follow-ups"), safeGet("/api/ai/recurring"), safeGet("/api/ai/receptionist/enquiries"), safeGet("/api/ai/customer-updates"), safeGet("/api/ai/quotes/drafts"), safeGet("/api/ai/operator/business-health"), safeGet("/clients"), safeGet("/team/workers"), safeGet("/api/ai/client-memory"),
      ]);
      const normalizedActions = toList(actions, ["actions"]).map((a) => ({ id: String(a?.id || a?._id || ""), type: String(a?.action_type || "warning").replace("assign_worker", "dispatch").replace("proof_pack_send", "proof_to_paid").replace("invoice_reminder", "follow_up").replace("quote_follow_up", "follow_up").replace("enquiry_follow_up", "receptionist").replace("worker_ack_follow_up", "follow_up").replace("recurring_run", "recurring").replace("customer_update", "customer_update").replace("quote_draft", "quote_builder").replace("client_memory", "client_memory").replace("missing_price", "missing_pricing").replace("create_invoice_draft", "invoice_assistant"), title: a?.title || "AI action", summary: a?.summary || a?.description || "", subtitle: "", status: a?.status || "pending", priority: a?.priority || "medium", job_id: String(a?.job_id || a?.payload?.job_id || ""), invoice_id: String(a?.invoice_id || a?.payload?.invoice_id || ""), quote_id: String(a?.quote_id || a?.payload?.quote_id || ""), client_id: String(a?.client_id || a?.payload?.client_id || ""), source: "backend" }));

      setData({ actions: normalizedActions, jobs: toList(jobs, ["jobs"]), invoices: toList(invoices, ["invoices"]), quotes: toList(quotes, ["quotes"]), proofPacks: toList(proofPacks, ["proof_packs", "items"]), followUps: toList(followUps, ["actions", "items"]), recurring: toList(recurring, ["rules", "items"]), receptionist: toList(receptionist, ["enquiries", "items"]), customerUpdates: toList(customerUpdates, ["updates", "items"]), quoteDrafts: toList(quoteDrafts, ["drafts", "items"]), health: health || {}, clients: toList(clients, ["clients"]), workers: toList(workers, ["workers"]), memory: toList(memory, ["items", "actions"]) });
    } catch {
      setError("Smart Hub could not load everything yet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const jobsToday = useMemo(() => data.jobs.filter((job) => String(job?.scheduled_date || job?.date || "").slice(0, 10) === new Date().toISOString().slice(0, 10)), [data.jobs]);
  const unassignedJobs = useMemo(() => data.jobs.filter((job) => !job?.worker_id && !job?.assigned_worker_id && !job?.assigned_to && !["completed", "cancelled"].includes(norm(job?.status))), [data.jobs]);
  const completedJobs = useMemo(() => data.jobs.filter((job) => ["completed", "done"].includes(norm(job?.status))), [data.jobs]);
  const completedNoInvoice = useMemo(() => completedJobs.filter((job) => !data.invoices.some((inv) => String(inv?.job_id || "") === idOf(job))), [completedJobs, data.invoices]);
  const completedNoProof = useMemo(() => completedJobs.filter((job) => !hasProofPackForJob(data.proofPacks, idOf(job))), [completedJobs, data.proofPacks]);
  const missingPricing = useMemo(() => completedJobs.filter((job) => !Number(job?.price || job?.total || 0)), [completedJobs]);
  const unpaidInvoices = useMemo(() => data.invoices.filter((inv) => ["sent", "open", "overdue", "unpaid"].includes(norm(inv?.status))), [data.invoices]);
  const quotesWaiting = useMemo(() => data.quotes.filter((q) => ["sent", "pending", "viewed", "waiting"].includes(norm(q?.status))), [data.quotes]);

  const buildGeneratedActions = () => {
    const actions = [];
    const seen = new Set();
    const pushAction = (action) => { if (!seen.has(action.id)) { seen.add(action.id); actions.push(action); } };

    unassignedJobs.forEach((job) => pushAction({ id: `dispatch-${idOf(job)}`, type: "dispatch", title: `Assign crew to ${job?.title || "job"}`, subtitle: `Client: ${job?.client_name || "Unassigned job"}`, summary: "Unassigned job is blocking dispatch.", status: "pending", priority: "high", job_id: idOf(job), client_id: String(job?.client_id || ""), source: "generated" }));
    completedNoInvoice.forEach((job) => pushAction({ id: `invoice-${idOf(job)}`, type: "invoice_assistant", title: `Create invoice for ${job?.title || "completed job"}`, subtitle: `Client: ${job?.client_name || "Client"}`, summary: "Completed job is ready for invoice creation.", status: "pending", priority: "high", job_id: idOf(job), source: "generated" }));
    completedNoProof.forEach((job) => pushAction({ id: `proof-${idOf(job)}`, type: "proof_to_paid", title: `Prepare proof pack for ${job?.title || "completed job"}`, subtitle: `Client: ${job?.client_name || "Client"}`, summary: "Proof pack is required before proof-to-paid flow.", status: "pending", priority: "medium", job_id: idOf(job), source: "generated" }));
    missingPricing.forEach((job) => pushAction({ id: `pricing-${idOf(job)}`, type: "missing_pricing", title: `Add pricing for ${job?.title || "completed job"}`, subtitle: `Client: ${job?.client_name || "Client"}`, summary: "Completed job is missing pricing.", status: "pending", priority: "high", job_id: idOf(job), source: "generated" }));
    unpaidInvoices.forEach((inv) => pushAction({ id: `invfollow-${idOf(inv)}`, type: "follow_up", title: `Invoice reminder for #${inv?.invoice_number || idOf(inv)}`, subtitle: `Status: ${inv?.status || "open"}`, summary: "Prepare follow-up reminder for unpaid invoice.", status: "pending", priority: "medium", invoice_id: idOf(inv), source: "generated" }));
    quotesWaiting.forEach((quote) => pushAction({ id: `quotefollow-${idOf(quote)}`, type: "follow_up", title: `Quote follow-up for #${quote?.quote_number || idOf(quote)}`, subtitle: `Status: ${quote?.status || "waiting"}`, summary: "Prepare follow-up for waiting quote.", status: "pending", priority: "medium", quote_id: idOf(quote), source: "generated" }));
    data.recurring.forEach((item) => pushAction({ id: `recurring-${idOf(item)}`, type: "recurring", title: `Recurring job due: ${item?.name || item?.title || "Recurring task"}`, subtitle: "Recurring work due", summary: "Recurring schedule requires review.", status: "pending", priority: "medium", source: "generated" }));
    data.receptionist.forEach((item) => pushAction({ id: `reception-${idOf(item)}`, type: "receptionist", title: `New enquiry: ${item?.subject || item?.name || "Customer enquiry"}`, subtitle: "Receptionist follow-up", summary: "Customer enquiry needs response prep.", status: "pending", priority: "medium", source: "generated" }));
    data.customerUpdates.forEach((item) => pushAction({ id: `custupdate-${idOf(item)}`, type: "customer_update", title: `Customer update draft ready`, subtitle: item?.title || "Draft update", summary: "Review customer update draft before sending.", status: "pending", priority: "low", source: "generated" }));
    data.memory.forEach((item) => pushAction({ id: `memory-${idOf(item)}`, type: "client_memory", title: "Client memory suggestion", subtitle: item?.client_name || "Client", summary: item?.suggestion || "Suggested next action is ready.", status: "pending", priority: "low", client_id: String(item?.client_id || ""), source: "generated" }));

    return actions;
  };

  const mergedActions = useMemo(() => [...data.actions, ...buildGeneratedActions()].filter((a) => !dismissedGenerated[a.id]), [data.actions, data.jobs, data.invoices, data.quotes, data.proofPacks, dismissedGenerated]);
  const pending = useMemo(() => mergedActions.filter((a) => !isDone(a)), [mergedActions]);
  const grouped = useMemo(() => ({ dispatch: pending.filter((a) => a.type === "dispatch"), invoices: pending.filter((a) => ["invoice_assistant", "missing_pricing"].includes(a.type)), proof: pending.filter((a) => a.type === "proof_to_paid"), follow: pending.filter((a) => a.type === "follow_up"), team: pending.filter((a) => a.type === "dispatch"), recurring: pending.filter((a) => a.type === "recurring"), customer: pending.filter((a) => a.type === "customer_update"), receptionist: pending.filter((a) => a.type === "receptionist"), memory: pending.filter((a) => a.type === "client_memory") }), [pending]);
  const topQueue = pending.slice(0, 6);

  const runAction = async (fn, success) => { setError(""); setNotice(""); try { await fn(); setNotice(success); await load(); } catch (e) { setError(String(e?.message || "Action failed.")); } };
  const approve = async (a) => { if (!actionCanExecute(a)) return window.location.assign(relatedPath(a)); if (a.source === "backend") return runAction(() => post(`/ai-operator/actions/${a.id}/approve`, {}), "Action approved and executed."); return runAction(() => post(`/proof-packs/prepare-for-job/${a.job_id}`, {}), "Proof pack preparation requested."); };
  const dismiss = (a) => a.source === "backend" ? runAction(() => post(`/ai-operator/actions/${a.id}/dismiss`, {}), "Action dismissed.") : setDismissedGenerated((p) => ({ ...p, [a.id]: true }));

  if (!roleAllowed(user?.role)) return <Layout><main className="smart-command-system"><section className="smart-command-panel"><h2>AI Operator dashboard is owner/manager/office admin only.</h2></section></main></Layout>;

  const warningCount = [data.health?.trial_ending, data.health?.no_active_plan, data.health?.payment_issue, data.health?.client_limit_near, data.health?.sms_credits_low, data.health?.myob_disconnected].filter(Boolean).length;
  const renderButtons = (a) => [{ label: actionPrimaryLabel(a), variant: actionCanExecute(a) ? "green" : "light", onClick: () => approve(a) }, { label: "Open", onClick: () => window.location.assign(relatedPath(a)) }, { label: "Dismiss", onClick: () => dismiss(a) }];

  return <Layout smartHubMode><main className="smart-command-system"><div className="smart-command-shell">
    <section className="smart-command-hero"><div className="smart-command-hero-grid"><div className="smart-command-logo-wrap"><ChurvoxLogo size="hero" /></div><div><p className="smart-command-kicker">Churvox</p><h1 className="smart-command-title">AI Operator Command Dashboard</h1><p className="smart-command-subtitle">AI scans your business, prepares the work, and waits for owner approval.</p><p className="smart-command-row-text">Welcome back{user?.business_name ? `, ${user.business_name}` : ""}.</p></div><div className="smart-command-next-card"><strong>AI Actions: {pending.length}</strong><strong>Approval queue: {pending.length}</strong><div className="smart-command-actions"><button className="smart-command-btn dark" onClick={() => runAction(() => post("/smart-hub/scan", {}), "AI scan completed.")}>Run AI Plan</button><button className="smart-command-btn light" onClick={() => setTab("queue")}>Open Queue</button></div></div></div></section>

    <section className="smart-command-panel smart-command-panel-heroic accent"><h2>Business Engine Summary</h2><p className="smart-command-brief">Command found {pending.length} things to handle today.</p><p>{unassignedJobs.length} jobs need crew · {jobsToday.length} jobs due today · {completedNoInvoice.length} completed jobs ready to invoice.</p><p>{unpaidInvoices.length} unpaid invoices · {quotesWaiting.length} quotes waiting · {completedNoProof.length} proof packs needed · {data.recurring.length} recurring jobs due · {data.customerUpdates.length} customer updates waiting{warningCount ? ` · ${warningCount} account warnings` : ""}.</p><p>Owner approval is required before Churvox executes.</p></section>

    <section className="smart-command-panel smart-command-priority"><p className="smart-command-kicker">Best Next Move</p><h2>Dispatch first: {unassignedJobs.length} jobs need crew assignment.</h2><button className="smart-command-btn primary" onClick={() => setTab("dispatch")}>Open Dispatch Queue</button></section>

    <section className="smart-command-control-grid">{[["Dispatch", unassignedJobs.length, "dispatch"], ["Revenue", grouped.invoices.length, "invoices"], ["Proof-to-Paid", grouped.proof.length, "proof"], ["Follow-Ups", grouped.follow.length, "follow"], ["Team / Crew", data.workers.length, "team"], ["Account Health", warningCount, "account"]].map(([label, count, key]) => <article key={key} className={`smart-command-panel smart-command-control ${count === 0 ? "muted" : ""}`}><h3>{label}</h3><p className="smart-command-big-count">{count}</p><button className="smart-command-btn light" onClick={() => setTab(key)}>Open</button></article>)}</section>

    <section className="smart-command-panel"><h2>Today&apos;s Run Sheet</h2><div className="smart-command-list">{jobsToday.length ? jobsToday.map((job) => <article className="smart-command-row" key={idOf(job)}><p className="smart-command-row-title">{job?.title || "Job"}</p><p className="smart-command-row-text">Client: {job?.client_name || "Client"} · {job?.address || job?.suburb || "No address"}</p><p className="smart-command-row-text">Worker: {job?.worker_name || "Unassigned"} · Status: {job?.status || "scheduled"} · Time: {job?.scheduled_time || "TBC"}</p><div className="smart-command-actions"><button className="smart-command-btn light" onClick={() => window.location.assign(`/jobs/${idOf(job)}`)}>Open Job</button></div></article>) : <div className="smart-command-empty"><p>No jobs are scheduled for today.</p><button className="smart-command-btn primary" onClick={() => window.location.assign("/jobs/new")}>New Job</button></div>}</div></section>

    <section className="smart-command-panel"><h2>Command Work Queue</h2><div className="smart-command-actions"><button className="smart-command-btn light" onClick={() => setTab("queue")}>View All</button></div><div className="smart-command-list">{topQueue.map((a) => <ActionRow key={a.id} item={a} buttons={renderButtons(a)} />)}</div></section>

    <section className="smart-command-panel"><h2>Workspace Dock</h2><div className="smart-command-dock">{[["Jobs", "/jobs"], ["Clients", "/clients"], ["Quotes", "/quotes"], ["Invoices", "/invoices"], ["Team", "/team"], ["Dispatch", "/dispatch"], ["Proof-to-Paid", "/proof-to-paid"], ["AI Operator / Approvals", "/smart-hub/brain"], ["Account & Plan", "/account-plan"], ["Settings", "/settings"]].map(([name, path]) => <button key={name} onClick={() => window.location.assign(path)}>{name}<span>Open workspace</span></button>)}</div></section>

    {tab === "queue" ? <section className="smart-command-panel"><h2>AI Approval Queue</h2><div className="smart-command-list">{pending.map((a) => <ActionRow key={`q-${a.id}`} item={a} buttons={renderButtons(a)} />)}</div></section> : null}
    {tab === "team" ? <section className="smart-command-panel"><h2>Team / Crew Panel</h2><p>Active workers: {data.workers.length} · Available workers: {data.workers.filter((w) => norm(w?.status) !== "offline").length} · Assigned jobs: {data.jobs.length - unassignedJobs.length} · Unassigned jobs: {unassignedJobs.length}</p><div className="smart-command-actions"><button className="smart-command-btn light" onClick={() => window.location.assign("/team")}>Open Team</button><button className="smart-command-btn light" onClick={() => window.location.assign("/dispatch")}>Open Dispatch</button></div></section> : null}
    {tab === "account" && warningCount > 0 ? <section className="smart-command-panel"><h2>Account & Plan Health</h2><p>Warnings detected across trial, billing, limits, credits, or integrations.</p><button className="smart-command-btn light" onClick={() => window.location.assign("/account-plan")}>Open Account & Plan Centre</button></section> : null}
    {notice ? <section className="smart-command-panel"><p>{notice}</p></section> : null}
    {error ? <section className="smart-command-panel"><p>{error}</p></section> : null}
    {loading ? <section className="smart-command-panel"><p>Loading Smart Hub...</p></section> : null}
  </div></main></Layout>;
}
