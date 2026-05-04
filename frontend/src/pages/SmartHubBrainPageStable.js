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
  for (const k of keys) if (Array.isArray(value[k])) return value[k];
  return Array.isArray(value.data) ? value.data : [];
};
const safeGet = async (path) => { try { return await get(path); } catch { return []; } };
const roleAllowed = (role) => ["owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"].includes(norm(role));
const moneyText = (n) => (Number.isFinite(Number(n)) ? `$${Number(n).toFixed(2)}` : "Amount unknown");
const isDone = (a) => ["completed", "dismissed", "rejected", "done", "failed"].includes(norm(a?.status));

const typeMap = {
  assign_worker: "dispatch", create_invoice_draft: "invoice_assistant", invoice_draft: "invoice_assistant", proof_pack_send: "proof_to_paid", invoice_reminder: "follow_up", quote_follow_up: "follow_up", enquiry_follow_up: "receptionist", worker_ack_follow_up: "follow_up", recurring_run: "recurring", customer_update: "customer_update", quote_draft: "quote_builder", client_memory: "client_memory", missing_price: "missing_pricing",
};

const normalizeAction = (a) => ({
  id: String(a?.id || a?._id || ""),
  type: typeMap[String(a?.action_type || "")] || String(a?.action_type || "warning") || "warning",
  title: a?.title || "AI action",
  summary: a?.summary || a?.description || "",
  reason: a?.reason || "",
  what_happens_if_approved: a?.what_happens_if_approved || a?.what_happens || "Prepared action will run with safety limits.",
  status: a?.status || "pending",
  priority: a?.priority || a?.risk || "medium",
  related_type: a?.related_type || "",
  related_id: String(a?.related_id || a?.related_entity_id || ""),
  client_id: String(a?.client_id || a?.payload?.client_id || ""),
  job_id: String(a?.job_id || a?.payload?.job_id || ""),
  quote_id: String(a?.quote_id || a?.payload?.quote_id || ""),
  invoice_id: String(a?.invoice_id || a?.payload?.invoice_id || ""),
  payload: a?.payload || {},
  source: "backend",
});

const clientNameForJob = (job, clients) => {
  const cid = String(job?.client_id || job?.customer_id || "");
  const c = clients.find((x) => idOf(x) === cid);
  return c?.name || c?.full_name || c?.company_name || job?.client_name || "Client";
};

const relatedPath = (a) => {
  if (a?.job_id) return `/jobs/${a.job_id}`;
  if (a?.invoice_id) return `/invoices/${a.invoice_id}`;
  if (a?.quote_id) return `/quotes/${a.quote_id}`;
  if (a?.client_id) return `/clients/${a.client_id}`;
  if (a?.related_type && a?.related_id) return `/${a.related_type}/${a.related_id}`;
  return "/smart-hub/brain";
};

const tabMatches = (tab, a) => {
  if (tab === "approvals") return !isDone(a);
  if (tab === "dispatch") return a.type === "dispatch" && !isDone(a);
  if (tab === "invoices") return ["invoice_assistant", "missing_pricing"].includes(a.type) && !isDone(a);
  if (tab === "proof") return a.type === "proof_to_paid" && !isDone(a);
  if (tab === "follow") return a.type === "follow_up" && !isDone(a);
  if (tab === "reception") return a.type === "receptionist" && !isDone(a);
  if (tab === "recurring") return a.type === "recurring" && !isDone(a);
  if (tab === "updates") return a.type === "customer_update" && !isDone(a);
  if (tab === "quotes") return a.type === "quote_builder" && !isDone(a);
  if (tab === "memory") return a.type === "client_memory" && !isDone(a);
  if (tab === "activity") return isDone(a);
  return true;
};

const buildGeneratedActions = (data) => {
  const actions = [];
  const invoicesByJob = new Set(data.invoices.map((i) => String(i?.job_id || "")).filter(Boolean));
  const proofByJob = new Set(data.proofPacks.map((p) => String(p?.job_id || p?.related_job_id || "")).filter(Boolean));

  data.jobs.forEach((j) => {
    const jid = idOf(j);
    if (!jid) return;
    const status = norm(j.status);
    const active = !["completed", "complete", "cancelled", "canceled"].includes(status);
    const completed = ["completed", "complete"].includes(status);
    const hasWorker = j.assigned_worker_id || j.worker_id || j.assigned_to;
    if (active && !hasWorker) actions.push({ id: `gen-dispatch-${jid}`, type: "dispatch", title: `Assign crew to ${clientNameForJob(j, data.clients)}`, summary: j?.title || j?.address || "Job is active and unassigned.", reason: "Job has no worker assigned.", what_happens_if_approved: "This action is prepared from live data. Open the related record to review and approve safely.", priority: "high", status: "pending", source: "generated", job_id: jid, related_type: "jobs", related_id: jid });
    if (completed && !invoicesByJob.has(jid)) {
      const amount = Number(j?.price_total ?? j?.total_price ?? j?.amount ?? 0);
      if (amount > 0) actions.push({ id: `gen-invoice-${jid}`, type: "invoice_assistant", title: `Prepare invoice for ${clientNameForJob(j, data.clients)}`, summary: `Completed job with pricing (${moneyText(amount)}).`, reason: "Completed job has no invoice yet.", what_happens_if_approved: "This action is prepared from live data. Open the related record to review and approve safely.", priority: "high", status: "pending", source: "generated", job_id: jid, related_type: "jobs", related_id: jid });
      else actions.push({ id: `gen-missing-pricing-${jid}`, type: "missing_pricing", title: `Add pricing before invoicing ${clientNameForJob(j, data.clients)}`, summary: "Completed job has no usable price.", reason: "Cannot create invoice until pricing is set.", what_happens_if_approved: "This action is prepared from live data. Open the related record to review and approve safely.", priority: "high", status: "pending", source: "generated", job_id: jid, related_type: "jobs", related_id: jid });
    }
    if (completed && !proofByJob.has(jid)) actions.push({ id: `gen-proof-${jid}`, type: "proof_to_paid", title: `Prepare proof pack for ${clientNameForJob(j, data.clients)}`, summary: "Completed job missing proof pack.", reason: "Proof-to-Paid flow needs proof assets.", what_happens_if_approved: "Attempts proof pack preparation for this job if endpoint is available.", priority: "medium", status: "pending", source: "generated", job_id: jid, related_type: "jobs", related_id: jid });
  });

  data.invoices.forEach((i) => {
    const status = norm(i.status);
    if (!["open", "sent", "overdue", "unpaid", "pending"].includes(status)) return;
    const iid = idOf(i);
    if (!iid) return;
    const due = i.balance_due ?? i.amount_due ?? i.outstanding ?? i.total;
    actions.push({ id: `gen-invoice-follow-${iid}`, type: "follow_up", title: "Prepare reminder for invoice", summary: `Invoice ${i?.number || iid} outstanding: ${moneyText(due)}.`, reason: "Invoice is awaiting payment.", what_happens_if_approved: "This action is prepared from live data. Open the related record to review and approve safely.", priority: "medium", status: "pending", source: "generated", invoice_id: iid, related_type: "invoices", related_id: iid });
  });

  data.quotes.forEach((q) => {
    const status = norm(q.status);
    if (!["sent", "pending", "waiting", "viewed"].includes(status)) return;
    const qid = idOf(q);
    if (!qid) return;
    actions.push({ id: `gen-quote-follow-${qid}`, type: "follow_up", title: "Follow up quote", summary: `Quote ${q?.number || qid} is waiting for response.`, reason: "Quote is pending customer action.", what_happens_if_approved: "This action is prepared from live data. Open the related record to review and approve safely.", priority: "medium", status: "pending", source: "generated", quote_id: qid, related_type: "quotes", related_id: qid });
  });

  data.receptionist.forEach((e) => actions.push({ id: `gen-reception-${idOf(e) || Math.random()}`, type: "receptionist", title: "Receptionist enquiry needs review", summary: String(e?.message || e?.summary || "New enquiry"), reason: "Receptionist queue contains unresolved enquiry.", what_happens_if_approved: "Open the related client or enquiry and confirm next action.", priority: "medium", status: "pending", source: "generated", client_id: String(e?.client_id || "") }));
  data.recurring.forEach((r) => actions.push({ id: `gen-recurring-${idOf(r) || Math.random()}`, type: "recurring", title: "Recurring work due", summary: String(r?.name || r?.title || "Recurring rule due"), reason: "Recurring schedule indicates a due run.", what_happens_if_approved: "Open recurring rule and run safely.", priority: "medium", status: "pending", source: "generated" }));
  data.customerUpdates.forEach((u) => actions.push({ id: `gen-update-${idOf(u) || Math.random()}`, type: "customer_update", title: "Customer update draft", summary: String(u?.summary || u?.message || "Prepared customer update"), reason: "Customer update queue contains pending item.", what_happens_if_approved: "Review and send update without exposing private location data.", priority: "low", status: "pending", source: "generated", client_id: String(u?.client_id || "") }));
  data.quoteDrafts.forEach((d) => actions.push({ id: `gen-qdraft-${idOf(d) || Math.random()}`, type: "quote_builder", title: "Quote draft ready", summary: String(d?.title || d?.summary || "Quote draft requires review"), reason: "Quote builder has a draft item.", what_happens_if_approved: "Open quote draft and finalize.", priority: "medium", status: "pending", source: "generated", quote_id: String(d?.quote_id || idOf(d) || "") }));
  data.memory.forEach((m) => actions.push({ id: `gen-memory-${idOf(m) || Math.random()}`, type: "client_memory", title: "Client memory insight", summary: String(m?.summary || m?.note || "Client context available"), reason: "Client memory produced actionable context.", what_happens_if_approved: "Open client record and apply this context.", priority: "low", status: "pending", source: "generated", client_id: String(m?.client_id || "") }));

  return actions;
};

function ActionRow({ item, buttons = [] }) {
  return <article className="smart-command-row"><div className="smart-command-badges"><span className="smart-command-badge">{item.priority}</span><span className="smart-command-badge type">{item.type}</span></div><p className="smart-command-row-title">{item.title}</p><p className="smart-command-row-text">{item.summary}</p><p className="smart-command-row-text"><b>Why AI picked this:</b> {item.reason || "-"}</p><p className="smart-command-row-text"><b>If approved:</b> {item.what_happens_if_approved}</p><p className="smart-command-row-text"><b>Related:</b> {item.related_label || "Review details in Command"}</p><div className="smart-command-actions">{buttons.map((b) => <button key={b.label} type="button" className={`smart-command-btn ${b.variant || "light"}`} onClick={b.onClick}>{b.label}</button>)}</div></article>;
}

export default function SmartHubBrainPageStable() {
  const { user } = useAuth();
  const [tab, setTab] = useState("today");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [dismissedGenerated, setDismissedGenerated] = useState({});
  const [data, setData] = useState({ actions: [], jobs: [], invoices: [], quotes: [], proofPacks: [], followUps: [], recurring: [], receptionist: [], customerUpdates: [], quoteDrafts: [], health: {}, clients: [], workers: [], memory: [] });

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [actions, jobs, invoices, quotes, proofPacks, followUps, recurring, receptionist, customerUpdates, quoteDrafts, health, clients, workers, memory] = await Promise.all([
        safeGet("/ai-operator/actions"), safeGet("/jobs"), safeGet("/invoices"), safeGet("/quotes"), safeGet("/proof-packs"), safeGet("/api/ai/follow-ups"), safeGet("/api/ai/recurring"), safeGet("/api/ai/receptionist/enquiries"), safeGet("/api/ai/customer-updates"), safeGet("/api/ai/quotes/drafts"), safeGet("/api/ai/operator/business-health"), safeGet("/clients"), safeGet("/team/workers"), safeGet("/api/ai/client-memory")
      ]);
      const unique = new Map();
      toList(actions, ["actions"]).map(normalizeAction).forEach((a) => { if (a.id && !unique.has(a.id)) unique.set(a.id, a); });
      setData({ actions: [...unique.values()], jobs: toList(jobs, ["jobs"]), invoices: toList(invoices, ["invoices"]), quotes: toList(quotes, ["quotes"]), proofPacks: toList(proofPacks, ["proof_packs", "items"]), followUps: toList(followUps, ["actions", "items"]), recurring: toList(recurring, ["rules", "items"]), receptionist: toList(receptionist, ["enquiries", "items"]), customerUpdates: toList(customerUpdates, ["updates", "items"]), quoteDrafts: toList(quoteDrafts, ["drafts", "items"]), health: health || {}, clients: toList(clients, ["clients"]), workers: toList(workers, ["workers"]), memory: toList(memory, ["items", "actions"]) });
    } catch {
      setError("Smart Hub could not load everything yet.");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const mergedActions = useMemo(() => {
    const generated = buildGeneratedActions(data);
    const key = (a) => `${a.type}|${a.job_id || ""}|${a.invoice_id || ""}|${a.quote_id || ""}|${a.client_id || ""}|${a.related_id || ""}`;
    const existing = new Set(data.actions.map(key));
    const filteredGenerated = generated.filter((g) => !existing.has(key(g)) && !dismissedGenerated[g.id]);
    return [...data.actions, ...filteredGenerated].map((a) => ({
      ...a,
      related_label: a.title?.includes(" for ") ? a.title.split(" for ")[1] : (a.payload?.label || a.summary || ""),
    }));
  }, [data, dismissedGenerated]);

  const pending = useMemo(() => mergedActions.filter((a) => !isDone(a)), [mergedActions]);
  useEffect(() => {
    setTab((prev) => {
      if ((prev === "today" || prev === "approvals") && pending.length > 0) return "approvals";
      if (pending.length === 0) return "today";
      return prev;
    });
  }, [pending.length]);
  const counts = {
    aiActions: pending.length,
    approvalQueue: pending.length,
    dispatch: pending.filter((a) => a.type === "dispatch").length,
    invoices: pending.filter((a) => ["invoice_assistant", "missing_pricing"].includes(a.type)).length,
    proof: pending.filter((a) => a.type === "proof_to_paid").length,
    follow: pending.filter((a) => a.type === "follow_up").length,
    reception: pending.filter((a) => a.type === "receptionist").length,
    recurring: pending.filter((a) => a.type === "recurring").length,
    updates: pending.filter((a) => a.type === "customer_update").length,
    quotes: pending.filter((a) => a.type === "quote_builder").length,
    memory: pending.filter((a) => a.type === "client_memory").length,
    activity: mergedActions.filter((a) => isDone(a)).length,
    readyInvoice: pending.filter((a) => a.type === "invoice_assistant").length,
    missingPricing: pending.filter((a) => a.type === "missing_pricing").length,
    proofPacks: pending.filter((a) => a.type === "proof_to_paid").length,
    invoiceReminders: pending.filter((a) => a.type === "follow_up" && a.invoice_id).length,
    quoteFollowUps: pending.filter((a) => a.type === "follow_up" && a.quote_id).length,
    recurringDue: pending.filter((a) => a.type === "recurring").length,
  };
  const bestNextMove = pending[0]?.title || "Run AI plan to generate today’s work queue.";
  const topQueue = pending.slice(0, 10);
  const priorityAction = pending[0] || null;
  const priorityReason = priorityAction?.reason || "This queue has the highest operational pressure right now.";
  const pressureLabel = counts.dispatch >= counts.follow ? "Dispatch pressure" : "Follow-up pressure";
  const runAction = async (fn, success) => {
    setError(""); setNotice("");
    try { await fn(); setNotice(success); await load(); } catch (e) { setError(String(e?.message || "Action failed.")); }
  };
  const approve = async (a) => {
    if (a.source === "backend") return runAction(() => post(`/ai-operator/actions/${a.id}/approve`, {}), "Action approved and executed.");
    if (a.type === "proof_to_paid" && a.job_id) {
      try {
        await post(`/proof-packs/prepare-for-job/${a.job_id}`, {});
        setNotice("Proof pack preparation requested.");
        await load();
      } catch {
        window.location.assign(relatedPath(a));
      }
      return;
    }
    setNotice("This action is prepared from live data. Open the related record to review and approve safely.");
  };
  const dismiss = (a) => {
    if (a.source === "backend") return runAction(() => post(`/ai-operator/actions/${a.id}/dismiss`, {}), "Action dismissed.");
    setDismissedGenerated((prev) => ({ ...prev, [a.id]: true }));
    setNotice("Generated action dismissed for this session.");
    return Promise.resolve();
  };
  if (!roleAllowed(user?.role)) return <Layout><main className="smart-command-system"><section className="smart-command-panel"><h2>AI Operator dashboard is owner/manager/office admin only.</h2></section></main></Layout>;

  const tabs = [["Today", "today", counts.aiActions], ["Approvals", "approvals", counts.approvalQueue], ["Dispatch", "dispatch", counts.dispatch], ["Invoices", "invoices", counts.invoices], ["Proof-to-Paid", "proof", counts.proof], ["Follow-Ups", "follow", counts.follow], ["Receptionist", "reception", counts.reception], ["Recurring", "recurring", counts.recurring], ["Customer Updates", "updates", counts.updates], ["Quote Builder", "quotes", counts.quotes], ["Client Memory", "memory", counts.memory], ["Activity", "activity", counts.activity]];
  const shown = mergedActions.filter((a) => tabMatches(tab, a));
  return <Layout smartHubMode><main className="smart-command-system"><div className="smart-command-shell"><section className="smart-command-hero"><div className="smart-command-hero-grid"><div className="smart-command-logo-wrap"><ChurvoxLogo size="hero" /></div><div><p className="smart-command-kicker">Smart Hub</p><h1 className="smart-command-title">AI Operator Command Dashboard</h1><p className="smart-command-subtitle">AI scans, owner approves, Churvox executes.</p></div><div className="smart-command-next-card"><p className="smart-command-kicker">Today</p><strong>AI Actions: {counts.aiActions}</strong><strong>Approval queue: {counts.approvalQueue}</strong><div className="smart-command-actions"><button className="smart-command-btn dark" onClick={() => runAction(() => post("/smart-hub/scan", {}), "AI scan completed.")}>Run AI plan</button><button className="smart-command-btn light" onClick={() => setTab("approvals")}>Open queue</button></div></div></div></section>
<section className="smart-command-dual-grid"><article className="smart-command-panel smart-command-panel-heroic accent"><h2>Business Engine Summary</h2><p className="smart-command-brief">Command found {counts.aiActions} things to handle today.</p><ul className="smart-command-summary-list"><li>{counts.dispatch} jobs need crew</li><li>{counts.invoiceReminders} invoice reminders are ready</li><li>{counts.quoteFollowUps} quotes need follow-up</li><li>{counts.proofPacks} proof packs need preparing</li><li>{counts.missingPricing} jobs need pricing before invoicing</li></ul><p>Awaiting approval before Churvox executes.</p></article><article className="smart-command-panel smart-command-priority"><p className="smart-command-kicker">Best next move</p><h2>{priorityAction ? priorityAction.title : "Command queue is clear"}</h2><p><b>Command priority:</b> {pressureLabel}</p><p><b>Why AI picked this:</b> {priorityReason}</p><div className="smart-command-actions"><button className="smart-command-btn primary" onClick={() => setTab("approvals")}>Open Command Queue</button><button className="smart-command-btn light" onClick={() => priorityAction ? window.location.assign(relatedPath(priorityAction)) : setTab("today")}>Review Priority Actions</button><button className="smart-command-btn dark" onClick={() => runAction(() => post("/smart-hub/scan", {}), "AI scan completed.")}>Run AI Plan</button></div></article></section>
<section className="smart-command-panel"><div className="smart-command-panel-head"><div><p className="smart-command-kicker">Priority actions</p><h2>Command Work Queue</h2><p>Top urgent actions are always visible.</p></div><span className="smart-command-queue-count">{topQueue.length} live</span></div><div className="smart-command-list">{topQueue.slice(0, 10).map((a) => <ActionRow key={`queue-${a.id}`} item={a} buttons={isDone(a) ? [] : [{ label: "Approve", variant: "green", onClick: () => approve(a) }, { label: "Review/Open", onClick: () => window.location.assign(relatedPath(a)) }, { label: "Dismiss", onClick: () => dismiss(a) }]} />)}{!topQueue.length ? <div className="smart-command-empty"><p>No live command queue items right now.</p><p>Next live work is in Dispatch and Follow-Ups.</p><button className="smart-command-btn light" onClick={() => setTab(counts.dispatch >= counts.follow ? "dispatch" : "follow")}>Open busiest section</button></div> : null}</div></section>
{notice ? <section className="smart-command-panel"><p>{notice}</p></section> : null}
{error ? <section className="smart-command-panel"><p>{error}</p></section> : null}
{loading ? <section className="smart-command-panel"><p>Loading Smart Hub...</p></section> : null}
<section className="smart-command-panel"><div className="smart-command-panel-head"><div><p className="smart-command-kicker">Command sections</p><h2>Command Section Tiles</h2></div></div><div className="smart-command-dock">{tabs.map(([n, k, c]) => <button key={k} onClick={() => setTab(k)}>{n}<span>{c} {tab === k ? "Open" : "items"}</span></button>)}</div></section>
{tab === "today" ? <section className="smart-command-panel"><h2>Today</h2><p><b>Best next move:</b> {bestNextMove}</p><div className="smart-command-mini-grid"><div className="smart-command-mini"><p className="smart-command-label">Business health score</p><b>{data.health.score || 0}</b></div><div className="smart-command-mini"><p className="smart-command-label">Dispatch jobs</p><b>{counts.dispatch}</b></div><div className="smart-command-mini"><p className="smart-command-label">Invoice work</p><b>{counts.invoices}</b></div><div className="smart-command-mini"><p className="smart-command-label">Follow-ups</p><b>{counts.follow}</b></div><div className="smart-command-mini"><p className="smart-command-label">Proof packs</p><b>{counts.proofPacks}</b></div><div className="smart-command-mini"><p className="smart-command-label">Quote follow-ups</p><b>{counts.quoteFollowUps}</b></div><div className="smart-command-mini"><p className="smart-command-label">Recurring work</p><b>{counts.recurringDue}</b></div></div><div className="smart-command-list">{topQueue.slice(0, 5).map((a) => <ActionRow key={`today-${a.id}`} item={a} buttons={[{ label: "Approve", variant: "green", onClick: () => approve(a) }, { label: "Review/Open", onClick: () => window.location.assign(relatedPath(a)) }, { label: "Dismiss", onClick: () => dismiss(a) }]} />)}</div></section> : null}
{["approvals", "dispatch", "invoices", "proof", "follow", "reception", "recurring", "updates", "quotes", "memory", "activity"].includes(tab) ? <section className="smart-command-panel"><h2>{tabs.find((t) => t[1] === tab)?.[0]}</h2>{shown.map((a) => <ActionRow key={a.id} item={a} buttons={isDone(a) ? [] : [{ label: "Approve", variant: "green", onClick: () => approve(a) }, { label: "Review/Open", onClick: () => window.location.assign(relatedPath(a)) }, { label: "Dismiss", onClick: () => dismiss(a) }]} />)}{!shown.length ? <div><p>No {tabs.find((t) => t[1] === tab)?.[0]} actions right now. Next live work is in Dispatch and Follow-Ups.</p><div className="smart-command-actions"><button className="smart-command-btn light" onClick={() => setTab("approvals")}>Open Approvals</button>{counts.dispatch > 0 ? <button className="smart-command-btn light" onClick={() => setTab("dispatch")}>Open Dispatch</button> : null}{counts.follow > 0 ? <button className="smart-command-btn light" onClick={() => setTab("follow")}>Open Follow-Ups</button> : null}<button className="smart-command-btn dark" onClick={() => runAction(() => post("/smart-hub/scan", {}), "AI scan completed.")}>Run AI plan</button></div></div> : null}</section> : null}
</div></main></Layout>;
}
