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
const safeGet = async (path) => { try { return await get(path); } catch { return []; } };
const ownerRoles = ["owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"];

const drawerMap = {
  ask: "Ask AI Operator", plan: "Today's Plan", dispatch: "Dispatch Plan", revenue: "Revenue Plan", follow: "Follow-Ups",
  proof: "Proof-to-Paid", runsheet: "Today's Run Sheet", approvals: "Approval Queue", action: "Action Details",
  jobs: "Jobs workspace", clients: "Clients workspace", quotes: "Quotes workspace", invoices: "Invoices workspace", team: "Team workspace", account: "Account & Plan", settings: "Settings"
};

export default function CommandHubRealPage() {
  const { user } = useAuth();
  const [data, setData] = useState({ jobs: [], clients: [], invoices: [], quotes: [], workers: [], proofPacks: [], receptionist: [], recurring: [], customerUpdates: [], quoteDrafts: [], memory: [], health: {} });
  const [actions, setActions] = useState([]);
  const [activeDrawer, setActiveDrawer] = useState("");
  const [drawerItems, setDrawerItems] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [notice, setNotice] = useState("");

  const canUseCommand = ownerRoles.includes(norm(user?.role));

  const load = async () => {
    const [jobs, clients, invoices, quotes, workers, proofPacks, receptionist, recurring, customerUpdates, quoteDrafts, memory, health] = await Promise.all([
      safeGet("/jobs"), safeGet("/clients"), safeGet("/invoices"), safeGet("/quotes"), safeGet("/team/workers"), safeGet("/proof-packs"), safeGet("/api/ai/receptionist/enquiries"), safeGet("/api/ai/recurring"), safeGet("/api/ai/customer-updates"), safeGet("/api/ai/quotes/drafts"), safeGet("/api/ai/client-memory"), safeGet("/api/ai/operator/business-health")
    ]);
    setData({ jobs: listFrom(jobs, ["jobs"]), clients: listFrom(clients, ["clients"]), invoices: listFrom(invoices, ["invoices"]), quotes: listFrom(quotes, ["quotes"]), workers: listFrom(workers, ["workers", "items"]), proofPacks: listFrom(proofPacks, ["proof_packs", "items"]), receptionist: listFrom(receptionist, ["enquiries", "items"]), recurring: listFrom(recurring, ["rules", "items"]), customerUpdates: listFrom(customerUpdates, ["updates", "items"]), quoteDrafts: listFrom(quoteDrafts, ["drafts", "items"]), memory: listFrom(memory, ["items", "actions"]), health: health || {} });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const built = [];
    data.jobs.forEach((j) => {
      const s = norm(j.status); const jid = idOf(j); if (!jid) return;
      if (!["completed", "complete", "cancelled", "canceled", "archived"].includes(s) && !(j.assigned_worker_id || j.worker_id)) built.push({ id: `d-${jid}`, type: "dispatch", title: `Assign crew to ${j.title || "job"}`, executable: true, job_id: jid, why: "Job has no worker" });
      if (["completed", "complete"].includes(s)) {
        const amount = Number(j.fixed_price ?? j.price ?? 0);
        built.push({ id: `i-${jid}`, type: amount > 0 ? "invoice" : "pricing", title: amount > 0 ? `Draft invoice for ${j.title || "job"}` : `Price ${j.title || "job"}`, executable: amount > 0, job_id: jid, why: amount > 0 ? "Completed and priced" : "No safe price" });
        const hasProof = j.proof_pack_id || data.proofPacks.some((p) => String(p.job_id) === jid);
        if (!hasProof) built.push({ id: `p-${jid}`, type: "proof", title: `Prepare proof pack for ${j.title || "job"}`, executable: true, job_id: jid, why: "Missing proof pack" });
      }
    });
    data.invoices.forEach((i) => ["open", "overdue", "unpaid", "sent"].includes(norm(i.status)) && built.push({ id: `f-${idOf(i)}`, type: "follow", title: `Follow up invoice ${i.invoice_number || idOf(i)}`, executable: false, invoice_id: idOf(i), why: "Money waiting" }));
    data.quotes.forEach((q) => ["sent", "pending", "waiting", "viewed"].includes(norm(q.status)) && built.push({ id: `q-${idOf(q)}`, type: "follow", title: `Follow up quote ${q.quote_number || idOf(q)}`, executable: false, quote_id: idOf(q), why: "Quote not converted" }));
    setActions(built);
  }, [data]);

  const groups = useMemo(() => ({
    dispatch: actions.filter((a) => a.type === "dispatch"), revenue: actions.filter((a) => ["invoice", "pricing"].includes(a.type)), follow: actions.filter((a) => a.type === "follow"), proof: actions.filter((a) => a.type === "proof")
  }), [actions]);

  const runSheet = useMemo(() => data.jobs.slice(0, 8), [data.jobs]);
  const moneyWaiting = data.invoices.filter((i) => ["open", "overdue", "unpaid", "sent"].includes(norm(i.status))).reduce((sum, i) => sum + Number(i.balance_due || i.amount_due || i.total || 0), 0);
  const healthScore = Number(data.health?.score || 82);

  const openDrawer = (key, items = [], workspace = "") => { setActiveDrawer(key); setDrawerItems(items); setSelectedWorkspace(workspace); };
  const executeAction = async (a) => {
    if (!a.executable) return;
    try { await post("/api/command-hub/actions/execute", { action: a.type, job_id: a.job_id, invoice_id: a.invoice_id, quote_id: a.quote_id }); setNotice("Action executed and queue refreshed."); await load(); }
    catch { setNotice("Action requires review in full workspace."); }
  };

  if (!canUseCommand) return <Layout><main className="smart-command-system"><section className="smart-command-panel"><h2>Command Hub is owner/admin only.</h2></section></main></Layout>;

  return <Layout smartHubMode><main className="smart-command-system"><div className="command-real-shell">
    <section className="command-hero"><div><div className="command-title-logo"><ChurvoxLogo size="hero" /><h1>Churvox Command Hub</h1></div><p>AI scans your business, prepares the work, and waits for owner approval.</p><div className="hero-buttons"><button onClick={() => openDrawer("plan", actions)}>Run AI Plan</button><button onClick={() => openDrawer("approvals", actions)}>Open Approval Queue</button><button onClick={() => openDrawer("ask")}>Ask AI Operator</button></div></div><aside><strong>Actions waiting: {actions.length}</strong><strong>Workers active: {data.workers.length}</strong><strong>Jobs needing crew: {groups.dispatch.length}</strong><strong>Follow-ups ready: {groups.follow.length}</strong><strong>Money waiting: ${moneyWaiting.toFixed(2)}</strong></aside></section>

    <section className="command-panel main-plan"><h2>AI Operator: Today’s Business Plan</h2><p>I found {actions.length} things that need attention today. Start with dispatch: {groups.dispatch.length} jobs have no crew. Then review {groups.follow.length} follow-ups.</p><div className="hero-buttons"><button onClick={() => openDrawer("plan", actions)}>Approve today’s plan</button><button onClick={() => openDrawer("approvals", actions)}>Review actions</button><button onClick={() => openDrawer("plan", actions)}>Edit plan</button><button onClick={() => setActions(actions.filter((a) => a.type !== "follow"))}>Dismiss low priority</button></div></section>

    <section className="command-control-grid"><article className="command-panel"><h3>Assign crew</h3><p>{groups.dispatch.length} jobs need workers</p><button onClick={() => openDrawer("dispatch", groups.dispatch)}>Review dispatch plan</button></article><article className="command-panel"><h3>Chase money</h3><p>{groups.revenue.length + groups.follow.length} follow-ups/revenue actions</p><button onClick={() => openDrawer("revenue", [...groups.revenue, ...groups.follow])}>Review revenue plan</button></article><article className="command-panel"><h3>Keep work moving</h3><p>{runSheet.length} jobs in today’s run sheet</p><button onClick={() => openDrawer("runsheet", runSheet)}>Open run sheet</button></article></section>

    <section className="command-panel"><h2>Today’s Run Sheet</h2><div className="command-run-list">{runSheet.length ? runSheet.map((job) => <article key={idOf(job)}><b>{job.title || "Job"}</b><span>{job.client_name || "Client"} · {job.status || "open"}</span><div className="mini-actions"><button onClick={() => openDrawer("action", [{ title: "View job", detail: job.title }])}>View</button><button onClick={() => openDrawer("action", [{ title: "Assign crew", detail: job.title }])}>Assign</button><button onClick={() => openDrawer("action", [{ title: "Invoice", detail: job.title }])}>Invoice</button><button onClick={() => openDrawer("action", [{ title: "Proof pack", detail: job.title }])}>Proof pack</button><button onClick={() => openDrawer("action", [{ title: "Message client", detail: job.title }])}>Message client</button></div></article>) : <div className="command-empty"><p>No jobs scheduled for today yet.</p></div>}</div></section>

    <section className="command-panel"><h2>Command Workspaces</h2><div className="command-workspace-grid">{[["jobs", "Jobs"], ["clients", "Clients"], ["quotes", "Quotes"], ["invoices", "Invoices"], ["team", "Team"], ["dispatch", "Dispatch"], ["proof", "Proof-to-Paid"], ["follow", "Follow-Ups"], ["approvals", "AI Approvals"], ["account", "Account & Plan"], ["settings", "Settings"]].map(([k, label]) => <button key={k} className="command-workspace-btn" onClick={() => openDrawer(k, [], k)}>{label}</button>)}</div></section>

    <section className="command-panel"><h2>Business Health: {healthScore}/100</h2><ul><li>Dispatch pressure: {groups.dispatch.length}</li><li>Unpaid money: ${moneyWaiting.toFixed(2)}</li><li>Worker gaps: {groups.dispatch.length}</li><li>Missing pricing: {groups.revenue.filter((a) => a.type === "pricing").length}</li><li>Jobs without proof: {groups.proof.length}</li><li>Plan/account warnings: {data.health?.warnings?.length || 0}</li></ul></section>

    <section className="command-panel"><h2>AI Approval Queue</h2><div className="command-filter-grid">{[["Dispatch", groups.dispatch], ["Revenue", groups.revenue], ["Follow-Ups", groups.follow], ["Proof-to-Paid", groups.proof], ["Receptionist", data.receptionist], ["Recurring", data.recurring], ["Customer Updates", data.customerUpdates], ["Quote Builder", data.quoteDrafts], ["Client Memory", data.memory], ["Account Health", data.health?.warnings || []]].map(([title, list]) => <button key={title} onClick={() => openDrawer("approvals", list)}>{title}<span>{list.length} items</span></button>)}</div></section>
    {notice ? <section className="command-notice">{notice}</section> : null}

    {activeDrawer ? <div className="command-drawer-backdrop" onClick={() => setActiveDrawer("")}><aside className="command-drawer" onClick={(e) => e.stopPropagation()}><div className="drawer-head"><h3>{drawerMap[activeDrawer] || "Workspace"}</h3><button onClick={() => setActiveDrawer("")}>Close</button></div>{activeDrawer === "ask" ? <div><p><b>Command summary:</b> {groups.dispatch.length} jobs need crew, {groups.follow.length} follow-ups ready, {groups.revenue.length} revenue actions waiting.</p><ul><li>What needs doing today?</li><li>Who should I assign this job to?</li><li>What invoices need chasing?</li><li>What jobs are ready to invoice?</li></ul></div> : <div className="drawer-items">{drawerItems.length ? drawerItems.map((item, idx) => <article key={item.id || idx} className="command-action-card"><h4>{item.title || item.name || `Item ${idx + 1}`}</h4><p>{item.why || item.detail || item.summary || "Review this in Command."}</p><div className="command-card-actions"><button onClick={() => { setSelectedAction(item); executeAction(item); }}>{item.executable ? "Approve" : "Review"}</button><button onClick={() => setSelectedAction(item)}>Edit</button><button onClick={() => setDrawerItems(drawerItems.filter((x) => x !== item))}>Dismiss</button><button onClick={() => window.location.assign(selectedWorkspace ? `/${selectedWorkspace}` : "/dashboard")}>Open full workspace</button></div></article>) : <p>Quick controls for this area appear here first.</p>}</div>}</aside></div> : null}
  </div></main></Layout>;
}
