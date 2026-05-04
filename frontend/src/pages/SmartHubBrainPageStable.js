import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import "../styles/smartCommandSystem.css";

const toList = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of keys) if (Array.isArray(value[key])) return value[key];
  return Array.isArray(value.data) ? value.data : [];
};
const norm = (value) => String(value || "").toLowerCase().trim();
const safeGet = async (path) => { try { return await get(path); } catch { return []; } };
const roleAllowed = (role) => ["owner", "manager", "office_admin"].includes(norm(role));

function ActionRow({ title, text, buttons = [] }) {
  return <article className="smart-command-row"><p className="smart-command-row-title">{title}</p><p className="smart-command-row-text">{text}</p><div className="smart-command-actions">{buttons.map((b) => <button key={b.label} type="button" className={`smart-command-btn ${b.variant || "light"}`} onClick={b.onClick}>{b.label}</button>)}</div></article>;
}

export default function SmartHubBrainPageStable() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState({ actions: [], jobs: [], invoices: [], quotes: [], proofPacks: [], followUps: [], recurring: [], receptionist: [], customerUpdates: [], quoteDrafts: [], health: {}, clients: [], workers: [] });
  const canOwnerAI = roleAllowed(user?.role);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [actions, jobs, invoices, quotes, proofPacks, followUps, recurring, receptionist, customerUpdates, quoteDrafts, health, clients, workers] = await Promise.all([
        safeGet("/ai-operator/actions"), safeGet("/jobs"), safeGet("/invoices"), safeGet("/quotes"), safeGet("/proof-packs"), safeGet("/api/ai/follow-ups"), safeGet("/api/ai/recurring"), safeGet("/api/ai/receptionist/enquiries"), safeGet("/api/ai/customer-updates"), safeGet("/api/ai/quotes/drafts"), safeGet("/api/ai/business-health"), safeGet("/clients"), safeGet("/team/workers"),
      ]);
      setData({
        actions: toList(actions, ["actions"]), jobs: toList(jobs, ["jobs"]), invoices: toList(invoices, ["invoices"]), quotes: toList(quotes, ["quotes"]),
        proofPacks: toList(proofPacks, ["proof_packs", "items"]), followUps: toList(followUps, ["actions", "items"]), recurring: toList(recurring, ["rules", "items"]), receptionist: toList(receptionist, ["enquiries", "items"]), customerUpdates: toList(customerUpdates, ["updates", "items"]), quoteDrafts: toList(quoteDrafts, ["drafts", "items"]),
        health: (health && typeof health === "object") ? health : {}, clients: toList(clients, ["clients"]), workers: toList(workers, ["workers"]),
      });
    } catch {
      setError("Smart Hub could not load everything yet.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const pendingActions = useMemo(() => data.actions.filter((a) => !["completed", "dismissed", "rejected", "done"].includes(norm(a.status))), [data.actions]);
  const counts = {
    aiActions: pendingActions.length,
    unassigned: data.jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "cancelled", "canceled"].includes(norm(j.status))).length,
    readyInvoice: data.jobs.filter((j) => ["completed", "complete"].includes(norm(j.status)) && !j.invoice_id).length,
    proofReady: data.proofPacks.filter((p) => ["ready", "prepared", "pending_review"].includes(norm(p.status))).length,
  };

  const act = async (fn) => { await fn(); await load(); };
  const openPath = (path) => window.location.assign(path);

  if (!canOwnerAI) return <Layout><main className="smart-command-system"><section className="smart-command-panel"><h2>AI Operator dashboard is owner/manager/office admin only.</h2></section></main></Layout>;

  return <Layout smartHubMode><main className="smart-command-system"><div className="smart-command-shell"><section className="smart-command-hero"><div className="smart-command-hero-grid"><div className="smart-command-logo-wrap"><ChurvoxLogo size="hero" /></div><div><p className="smart-command-kicker">Smart Hub</p><h1 className="smart-command-title">AI Operator Command Dashboard</h1><p className="smart-command-subtitle">Central review for all prepared AI actions.</p></div><div className="smart-command-next-card"><p className="smart-command-kicker">Today</p><strong>AI Actions: {counts.aiActions}</strong><div className="smart-command-actions"><button className="smart-command-btn dark" onClick={() => act(() => post("/ai-operator/run-daily-plan", {}))}>Run AI plan</button></div></div></div></section>
  {error ? <section className="smart-command-panel"><p>{error}</p></section> : null}
  {loading ? <section className="smart-command-panel"><p>Loading Smart Hub...</p></section> : null}

  <section className="smart-command-panel"><div className="smart-command-dock">{[["Overview","overview"],["Approvals","approvals"],["Dispatch","dispatch"],["Invoices","invoices"],["Proof-to-Paid","proof"],["Follow-Ups","follow"],["Receptionist","reception"],["Recurring","recurring"],["Customer Updates","updates"],["Quote Builder","quotes"],["Client Memory","memory"],["AI Settings","settings"],["Activity","activity"]].map(([n,k]) => <button key={k} onClick={() => setTab(k)}>{n}<span>{tab===k?"Open":"View"}</span></button>)}</div></section>

  {tab === "overview" ? <section className="smart-command-panel"><h2>Overview</h2><div className="smart-command-mini-grid"><div className="smart-command-mini"><p className="smart-command-label">Unassigned jobs</p><b>{counts.unassigned}</b></div><div className="smart-command-mini"><p className="smart-command-label">Ready to invoice</p><b>{counts.readyInvoice}</b></div><div className="smart-command-mini"><p className="smart-command-label">Proof packs ready</p><b>{counts.proofReady}</b></div><div className="smart-command-mini"><p className="smart-command-label">Business health</p><b>{data.health.score || 0} ({data.health.label || "unknown"})</b></div></div></section> : null}

  {tab === "approvals" ? <section className="smart-command-panel"><h2>AI Owner Approval Queue</h2>{pendingActions.map((a) => <ActionRow key={a.id || a._id} title={a.title || a.action_type || "AI action"} text={a.reason || a.summary || "Prepared for owner review."} buttons={[{label:"Approve",variant:"green",onClick:()=>act(() => post(`/ai-operator/actions/${a.id || a._id}/approve`, {}))},{label:"Edit/Review",onClick:()=>openPath(`/dashboard?action=${a.id || a._id}`)},{label:"Dismiss",onClick:()=>act(() => post(`/ai-operator/actions/${a.id || a._id}/dismiss`, {}))},{label:"Open",onClick:()=>openPath(`/${a.related_type || "jobs"}`)}]} />)}</section> : null}

  {tab === "proof" ? <section className="smart-command-panel"><h2>Proof-to-Paid</h2>{data.jobs.filter((j) => ["completed","complete"].includes(norm(j.status))).slice(0, 8).map((j) => <ActionRow key={j.id || j._id} title={j.title || "Completed job"} text="Completed job needing proof pack." buttons={[{label:"Prepare proof pack",onClick:()=>act(() => post(`/proof-packs/prepare-for-job/${j.id || j._id}`, {}))},{label:"Open Proof-to-Paid",onClick:()=>openPath("/automation")}]}/>)}{data.proofPacks.map((p) => <ActionRow key={p.id || p._id} title={`Proof pack ${p.id || p._id}`} text={`Status: ${p.status || "draft"}`} buttons={[{label:"Review",onClick:()=>openPath(`/automation`)},{label:"Approve",variant:"green",onClick:()=>act(() => post(`/proof-packs/${p.id || p._id}/approve`, {}))}]} />)}</section> : null}

  {tab === "updates" ? <section className="smart-command-panel"><h2>Customer Live Job Updates</h2>{data.customerUpdates.map((u) => <ActionRow key={u.id || u._id} title={u.type || "Update draft"} text={(u.message || "Draft customer update").replace(/GPS:[^,\n]+/gi, "")} buttons={[{label:"Approve/copy",variant:"green",onClick:()=>act(() => post(`/api/ai/customer-updates/${u.id || u._id}/approve`, {send_now:false}))},{label:"Skip",onClick:()=>act(() => post(`/api/ai/customer-updates/${u.id || u._id}/skip`, {}))},{label:"Open job",onClick:()=>openPath(`/jobs/${u.job_id || ""}`)}]} />)}</section> : null}

  {tab === "quotes" ? <section className="smart-command-panel"><h2>AI Quote Builder</h2><div className="smart-command-actions"><button className="smart-command-btn light" onClick={()=>act(() => post("/api/ai/quotes/drafts", {description:"", photos:[]}))}>Create quote draft</button></div>{data.quoteDrafts.map((d)=><ActionRow key={d.id||d._id} title={d.title||"Quote draft"} text={d.description||"Draft from description/photos."} buttons={[{label:"Review quote drafts",onClick:()=>openPath('/quotes')},{label:"Convert to quote",variant:"green",onClick:()=>act(() => post(`/api/ai/quotes/drafts/${d.id||d._id}/approve`, {}))},{label:"Dismiss",onClick:()=>act(() => post(`/api/ai/quotes/drafts/${d.id||d._id}/dismiss`, {}))}]} />)}</section> : null}
  </div></main></Layout>;
}
