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

const actionCanExecute = (a) => a.source === "backend" || (a.type === "proof_to_paid" && a.job_id);
const actionPrimaryLabel = (a) => (actionCanExecute(a) ? "Approve" : "Review");

const typeMap = { assign_worker: "dispatch", create_invoice_draft: "invoice_assistant", invoice_draft: "invoice_assistant", proof_pack_send: "proof_to_paid", invoice_reminder: "follow_up", quote_follow_up: "follow_up", enquiry_follow_up: "receptionist", worker_ack_follow_up: "follow_up", recurring_run: "recurring", customer_update: "customer_update", quote_draft: "quote_builder", client_memory: "client_memory", missing_price: "missing_pricing" };
const normalizeAction = (a) => ({ id: String(a?.id || a?._id || ""), type: typeMap[String(a?.action_type || "")] || String(a?.action_type || "warning") || "warning", title: a?.title || "AI action", summary: a?.summary || a?.description || "", reason: a?.reason || "", what_happens_if_approved: a?.what_happens_if_approved || a?.what_happens || "Prepared action will run with safety limits.", status: a?.status || "pending", priority: a?.priority || a?.risk || "medium", related_type: a?.related_type || "", related_id: String(a?.related_id || a?.related_entity_id || ""), client_id: String(a?.client_id || a?.payload?.client_id || ""), job_id: String(a?.job_id || a?.payload?.job_id || ""), quote_id: String(a?.quote_id || a?.payload?.quote_id || ""), invoice_id: String(a?.invoice_id || a?.payload?.invoice_id || ""), payload: a?.payload || {}, source: "backend" });

const clientNameForJob = (job, clients) => { const c = clients.find((x) => idOf(x) === String(job?.client_id || job?.customer_id || "")); return c?.name || c?.full_name || c?.company_name || job?.client_name || "Client"; };
const relatedPath = (a) => a?.job_id ? `/jobs/${a.job_id}` : a?.invoice_id ? `/invoices/${a.invoice_id}` : a?.quote_id ? `/quotes/${a.quote_id}` : a?.client_id ? `/clients/${a.client_id}` : a?.related_type && a?.related_id ? `/${a.related_type}/${a.related_id}` : "/smart-hub/brain";

const cleanActionTitle = (a) => {
  if (a.type === "dispatch") return `Assign crew to ${a.summary?.split(" ")[0] || "job"}`;
  if (a.type === "proof_to_paid") return "Completed job needs proof pack";
  if (a.type === "follow_up" && a.invoice_id) return "Invoice reminder ready";
  return a.title;
};

function ActionRow({ item, buttons = [] }) {
  return <article className="smart-command-row"><div className="smart-command-badges"><span className="smart-command-badge">{item.priority}</span><span className="smart-command-badge type">{item.type}</span></div><p className="smart-command-row-title">{cleanActionTitle(item)}</p><p className="smart-command-row-text">{item.summary}</p><p className="smart-command-row-text"><b>Why:</b> {item.reason || "-"}</p><div className="smart-command-actions">{buttons.map((b) => <button key={b.label} type="button" className={`smart-command-btn ${b.variant || "light"}`} onClick={b.onClick}>{b.label}</button>)}</div></article>;
}

export default function SmartHubBrainPageStable() { const { user } = useAuth(); const [tab, setTab] = useState("today"); const [loading, setLoading] = useState(true); const [notice, setNotice] = useState(""); const [error, setError] = useState(""); const [dismissedGenerated, setDismissedGenerated] = useState({}); const [data, setData] = useState({ actions: [], jobs: [], invoices: [], quotes: [], proofPacks: [], followUps: [], recurring: [], receptionist: [], customerUpdates: [], quoteDrafts: [], health: {}, clients: [], workers: [], memory: [] });

const load = async () => { setLoading(true); setError(""); try { const [actions, jobs, invoices, quotes, proofPacks, followUps, recurring, receptionist, customerUpdates, quoteDrafts, health, clients, workers, memory] = await Promise.all([safeGet("/ai-operator/actions"), safeGet("/jobs"), safeGet("/invoices"), safeGet("/quotes"), safeGet("/proof-packs"), safeGet("/api/ai/follow-ups"), safeGet("/api/ai/recurring"), safeGet("/api/ai/receptionist/enquiries"), safeGet("/api/ai/customer-updates"), safeGet("/api/ai/quotes/drafts"), safeGet("/api/ai/operator/business-health"), safeGet("/clients"), safeGet("/team/workers"), safeGet("/api/ai/client-memory")]); const unique = new Map(); toList(actions, ["actions"]).map(normalizeAction).forEach((a) => { if (a.id && !unique.has(a.id)) unique.set(a.id, a); }); setData({ actions: [...unique.values()], jobs: toList(jobs, ["jobs"]), invoices: toList(invoices, ["invoices"]), quotes: toList(quotes, ["quotes"]), proofPacks: toList(proofPacks, ["proof_packs", "items"]), followUps: toList(followUps, ["actions", "items"]), recurring: toList(recurring, ["rules", "items"]), receptionist: toList(receptionist, ["enquiries", "items"]), customerUpdates: toList(customerUpdates, ["updates", "items"]), quoteDrafts: toList(quoteDrafts, ["drafts", "items"]), health: health || {}, clients: toList(clients, ["clients"]), workers: toList(workers, ["workers"]), memory: toList(memory, ["items", "actions"]) }); } catch { setError("Smart Hub could not load everything yet."); } finally { setLoading(false); } };
useEffect(() => { load(); }, []);

const buildGeneratedActions = () => []; // keep backend + existing generated from previous deploy state
const mergedActions = useMemo(() => [...data.actions, ...buildGeneratedActions()].filter((a) => !dismissedGenerated[a.id]), [data.actions, dismissedGenerated]);
const pending = useMemo(() => mergedActions.filter((a) => !isDone(a)), [mergedActions]);
const grouped = useMemo(() => ({ dispatch: pending.filter((a) => a.type === "dispatch"), proof: pending.filter((a) => a.type === "proof_to_paid"), follow: pending.filter((a) => a.type === "follow_up"), revenue: pending.filter((a) => ["invoice_assistant", "missing_pricing"].includes(a.type)), reception: pending.filter((a) => a.type === "receptionist") }), [pending]);
const topQueue = pending.slice(0, 3);

const runAction = async (fn, success) => { setError(""); setNotice(""); try { await fn(); setNotice(success); await load(); } catch (e) { setError(String(e?.message || "Action failed.")); } };
const approve = async (a) => { if (!actionCanExecute(a)) return window.location.assign(relatedPath(a)); if (a.source === "backend") return runAction(() => post(`/ai-operator/actions/${a.id}/approve`, {}), "Action approved and executed."); return runAction(() => post(`/proof-packs/prepare-for-job/${a.job_id}`, {}), "Proof pack preparation requested."); };
const dismiss = (a) => a.source === "backend" ? runAction(() => post(`/ai-operator/actions/${a.id}/dismiss`, {}), "Action dismissed.") : setDismissedGenerated((p) => ({ ...p, [a.id]: true }));

if (!roleAllowed(user?.role)) return <Layout><main className="smart-command-system"><section className="smart-command-panel"><h2>AI Operator dashboard is owner/manager/office admin only.</h2></section></main></Layout>;

const renderButtons = (a) => [{ label: actionPrimaryLabel(a), variant: actionCanExecute(a) ? "green" : "light", onClick: () => approve(a) }, { label: "Open", onClick: () => window.location.assign(relatedPath(a)) }, { label: "Dismiss", onClick: () => dismiss(a) }];

return <Layout smartHubMode><main className="smart-command-system"><div className="smart-command-shell"><section className="smart-command-hero"><div className="smart-command-hero-grid"><div className="smart-command-logo-wrap"><ChurvoxLogo size="hero" /></div><div><p className="smart-command-kicker">Smart Hub</p><h1 className="smart-command-title">AI Operator Command Dashboard</h1><p className="smart-command-subtitle">AI scans, owner approves, Churvox executes.</p></div><div className="smart-command-next-card"><strong>AI Actions: {pending.length}</strong><strong>Approval queue: {pending.length}</strong><div className="smart-command-actions"><button className="smart-command-btn dark" onClick={() => runAction(() => post("/smart-hub/scan", {}), "AI scan completed.")}>Run AI plan</button><button className="smart-command-btn light" onClick={() => setTab("approvals")}>Open queue</button></div></div></div></section>
<section className="smart-command-panel smart-command-panel-heroic accent"><h2>Business Engine Summary</h2><p className="smart-command-brief">Command found {pending.length} things to handle today.</p><p>{grouped.dispatch.length} jobs need crew · {grouped.follow.length} follow-ups are ready · {grouped.proof.length} proof packs need preparing.</p><p>Owner approval is required before Churvox executes.</p></section>
<section className="smart-command-panel smart-command-priority"><p className="smart-command-kicker">Best next move</p><h2>Start with Dispatch. {grouped.dispatch.length} jobs have no crew assigned.</h2><p>Jobs without workers block the day’s schedule.</p><button className="smart-command-btn primary" onClick={() => setTab("dispatch")}>Open Dispatch Queue</button></section>
<section className="smart-command-control-grid">{[["Dispatch Command", grouped.dispatch.length, "Open Dispatch Queue", "dispatch"],["Revenue Command", grouped.revenue.length, "Open Revenue Queue", "invoices"],["Proof-to-Paid Command", grouped.proof.length, "Open Proof Queue", "proof"],["Follow-Up Command", grouped.follow.length, "Open Follow-Ups", "follow"],["Client/Reception Command", grouped.reception.length, "Open Reception", "reception"]].map(([label,count,cta,key]) => <article key={key} className={`smart-command-panel smart-command-control ${count===0?"muted":""}`}><h3>{label}</h3><p className="smart-command-big-count">{count}</p><button className="smart-command-btn light" onClick={() => setTab(key)}>{cta}</button></article>)}</section>
<section className="smart-command-panel"><div className="smart-command-panel-head"><h2>Command Work Queue</h2><span className="smart-command-queue-count">Top {topQueue.length} urgent</span></div><div className="smart-command-actions"><button className="smart-command-btn light" onClick={() => setTab("approvals")}>View all {pending.length} approvals</button><button className="smart-command-btn light" onClick={() => setTab("dispatch")}>Open Dispatch</button><button className="smart-command-btn light" onClick={() => setTab("follow")}>Open Follow-Ups</button><button className="smart-command-btn light" onClick={() => setTab("proof")}>Open Proof-to-Paid</button></div><div className="smart-command-list">{topQueue.map((a) => <ActionRow key={a.id} item={a} buttons={renderButtons(a)} />)}</div></section>
<section className="smart-command-panel"><h2>Command Section Tiles</h2><div className="smart-command-dock">{[["Approvals","approvals",pending.length],["Dispatch","dispatch",grouped.dispatch.length],["Invoices","invoices",grouped.revenue.length],["Proof-to-Paid","proof",grouped.proof.length],["Follow-Ups","follow",grouped.follow.length],["Reception","reception",grouped.reception.length]].map(([n,k,c]) => <button key={k} onClick={() => setTab(k)}>{n}<span>{c} items</span></button>)}</div></section>
{["approvals","dispatch","invoices","proof","follow","reception"].includes(tab) ? <section className="smart-command-panel"><h2>{tab}</h2><div className="smart-command-list">{(tab==="approvals"?pending:grouped[tab]||grouped.revenue).map((a) => <ActionRow key={`d-${a.id}`} item={a} buttons={renderButtons(a)} />)}</div></section> : null}
{notice ? <section className="smart-command-panel"><p>{notice}</p></section> : null}{error ? <section className="smart-command-panel"><p>{error}</p></section> : null}{loading ? <section className="smart-command-panel"><p>Loading Smart Hub...</p></section> : null}
</div></main></Layout>;
}
