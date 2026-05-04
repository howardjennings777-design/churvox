import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import "../styles/smartCommandSystem.css";

const norm = (v) => String(v || "").toLowerCase().trim();
const toList = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const k of keys) if (Array.isArray(value[k])) return value[k];
  return Array.isArray(value.data) ? value.data : [];
};
const safeGet = async (path) => { try { return await get(path); } catch { return []; } };
const roleAllowed = (role) => ["owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"].includes(norm(role));

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
  worker_id: String(a?.worker_id || a?.payload?.worker_id || a?.payload?.recommended_worker_id || ""),
  payload: a?.payload || {},
  source: a?.source || "ai-operator",
});

function ActionRow({ item, buttons = [] }) {
  return <article className="smart-command-row"><p className="smart-command-row-title">{item.title}</p><p className="smart-command-row-text">{item.reason || item.summary}</p><p className="smart-command-row-text"><b>Priority:</b> {item.priority} · <b>Type:</b> {item.type}</p><div className="smart-command-actions">{buttons.map((b) => <button key={b.label} type="button" className={`smart-command-btn ${b.variant || "light"}`} onClick={b.onClick}>{b.label}</button>)}</div></article>;
}

export default function SmartHubBrainPageStable() {
  const { user } = useAuth();
  const [tab, setTab] = useState("today");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
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

  const pending = useMemo(() => data.actions.filter((a) => !["completed", "dismissed", "rejected", "done"].includes(norm(a.status))), [data.actions]);
  const counts = {
    aiActions: pending.length,
    unassigned: data.jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "cancelled", "canceled"].includes(norm(j.status))).length,
    readyInvoice: data.jobs.filter((j) => ["completed", "complete"].includes(norm(j.status)) && !j.invoice_id).length,
    unpaidInvoices: data.invoices.filter((i) => ["sent", "overdue", "open"].includes(norm(i.status))).length,
    quotesWaiting: data.quotes.filter((q) => ["sent", "draft"].includes(norm(q.status))).length,
    recurringDue: data.recurring.length,
  };
  const runAction = async (fn, success) => {
    setError(""); setNotice("");
    try { await fn(); setNotice(success); await load(); } catch (e) { setError(String(e?.message || "Action failed.")); }
  };
  const approve = (a) => runAction(() => post(`/ai-operator/actions/${a.id}/approve`, {}), "Action approved and executed.");
  const dismiss = (a) => runAction(() => post(`/ai-operator/actions/${a.id}/dismiss`, {}), "Action dismissed.");
  if (!roleAllowed(user?.role)) return <Layout><main className="smart-command-system"><section className="smart-command-panel"><h2>AI Operator dashboard is owner/manager/office admin only.</h2></section></main></Layout>;

  const tabs = [["Today", "today"], ["Approvals", "approvals"], ["Dispatch", "dispatch"], ["Invoices", "invoices"], ["Proof-to-Paid", "proof"], ["Follow-Ups", "follow"], ["Receptionist", "reception"], ["Recurring", "recurring"], ["Customer Updates", "updates"], ["Quote Builder", "quotes"], ["Client Memory", "memory"], ["Activity", "activity"]];
  return <Layout smartHubMode><main className="smart-command-system"><div className="smart-command-shell"><section className="smart-command-hero"><div className="smart-command-hero-grid"><div className="smart-command-logo-wrap"><ChurvoxLogo size="hero" /></div><div><p className="smart-command-kicker">Smart Hub</p><h1 className="smart-command-title">AI Operator Command Dashboard</h1><p className="smart-command-subtitle">AI scans, owner approves, Churvox executes.</p></div><div className="smart-command-next-card"><p className="smart-command-kicker">Today</p><strong>AI Actions: {counts.aiActions}</strong><strong>Approval queue: {pending.length}</strong><div className="smart-command-actions"><button className="smart-command-btn dark" onClick={() => runAction(() => post("/smart-hub/scan", {}), "AI scan completed.")}>Run AI plan</button><button className="smart-command-btn light" onClick={() => setTab("approvals")}>Open queue</button></div></div></div></section>
{notice ? <section className="smart-command-panel"><p>{notice}</p></section> : null}
{error ? <section className="smart-command-panel"><p>{error}</p></section> : null}
{loading ? <section className="smart-command-panel"><p>Loading Smart Hub...</p></section> : null}
<section className="smart-command-panel"><div className="smart-command-dock">{tabs.map(([n, k]) => <button key={k} onClick={() => setTab(k)}>{n}<span>{tab === k ? "Open" : "View"}</span></button>)}</div></section>
{tab === "today" ? <section className="smart-command-panel"><h2>Today</h2><div className="smart-command-mini-grid"><div className="smart-command-mini"><p className="smart-command-label">Business health score</p><b>{data.health.score || 0}</b></div><div className="smart-command-mini"><p className="smart-command-label">Ready to invoice</p><b>{counts.readyInvoice}</b></div><div className="smart-command-mini"><p className="smart-command-label">Unassigned jobs</p><b>{counts.unassigned}</b></div><div className="smart-command-mini"><p className="smart-command-label">Unpaid invoices</p><b>{counts.unpaidInvoices}</b></div><div className="smart-command-mini"><p className="smart-command-label">Quotes waiting</p><b>{counts.quotesWaiting}</b></div><div className="smart-command-mini"><p className="smart-command-label">Recurring due</p><b>{counts.recurringDue}</b></div></div></section> : null}
{["approvals", "dispatch", "invoices", "proof", "follow", "reception", "recurring", "updates", "quotes", "memory"].includes(tab) ? <section className="smart-command-panel"><h2>{tabs.find((t) => t[1] === tab)?.[0]}</h2>{pending.filter((a) => tab === "approvals" ? true : (tab === "proof" ? a.type === "proof_to_paid" : tab === "dispatch" ? a.type === "dispatch" : tab === "invoices" ? ["invoice_assistant", "missing_pricing"].includes(a.type) : tab === "follow" ? a.type === "follow_up" : tab === "reception" ? a.type === "receptionist" : tab === "recurring" ? a.type === "recurring" : tab === "updates" ? a.type === "customer_update" : tab === "quotes" ? a.type === "quote_builder" : a.type === "client_memory")).map((a) => <ActionRow key={a.id} item={a} buttons={[{ label: "Approve", variant: "green", onClick: () => approve(a) }, { label: "Review/Edit", onClick: () => window.location.assign(`/dashboard?action=${a.id}`) }, { label: "Dismiss", onClick: () => dismiss(a) }, { label: "Open related", onClick: () => window.location.assign(`/${a.related_type || "jobs"}/${a.related_id || ""}`) }]} />)}{!pending.length ? <p>No pending actions.</p> : null}</section> : null}
{tab === "activity" ? <section className="smart-command-panel"><h2>Activity</h2>{data.actions.filter((a) => ["completed", "dismissed", "rejected", "done", "failed"].includes(norm(a.status))).map((a) => <ActionRow key={a.id} item={a} />)}</section> : null}
</div></main></Layout>;
}
