import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { useAuth } from "../context/AuthContext";
import { get, patch, post } from "../lib/api";
import { idOf, listFrom, money, norm, unwrap } from "../lib/commandHubUtils";
import "../styles/smartCommandSystem.css";
import "../styles/commandHubReal.css";
import "../styles/commandHubCompact.css";
import "../styles/commandHubModernFix.css";

const OWNER_ROLES = ["owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"];
const canUse = (role) => OWNER_ROLES.includes(norm(role));
const today = () => new Date().toISOString().slice(0, 10);

const safeGet = async (path) => { try { return await get(path); } catch { return null; } };
const Btn = ({ children, ...props }) => <button className="command-btn" {...props}>{children}</button>;

export default function CommandHubTopPlayerPage() {
  const { user } = useAuth();
  const [data, setData] = useState({}); const [drawer, setDrawer] = useState(null); const [notice, setNotice] = useState("");
  const [offline, setOffline] = useState(false);

  const load = async () => {
    const rs = await Promise.all([safeGet("/ai/operator/today-plan"), safeGet("/command-hub/actions"), safeGet("/jobs"), safeGet("/clients"), safeGet("/invoices"), safeGet("/quotes"), safeGet("/team/workers"), safeGet("/proof-packs"), safeGet("/ai/receptionist/enquiries"), safeGet("/ai/recurring"), safeGet("/ai/customer-updates"), safeGet("/ai/quotes/drafts"), safeGet("/ai/client-memory"), safeGet("/ai/operator/business-health")]);
    setOffline(rs.some((x) => x === null));
    setData({
      plan: unwrap(rs[0]) || {}, actions: listFrom(rs[1], ["actions", "items"]), jobs: listFrom(rs[2], ["jobs"]), clients: listFrom(rs[3], ["clients"]), invoices: listFrom(rs[4], ["invoices"]), quotes: listFrom(rs[5], ["quotes"]), workers: listFrom(rs[6], ["workers", "items"]), proof: listFrom(rs[7], ["proof_packs", "items"]), enquiries: listFrom(rs[8], ["enquiries", "items"]), recurring: listFrom(rs[9], ["rules", "items"]), updates: listFrom(rs[10], ["updates", "items"]), drafts: listFrom(rs[11], ["drafts", "items"]), memory: listFrom(rs[12], ["items"]), health: unwrap(rs[13]) || {},
    });
  };
  useEffect(() => { load(); }, []);
  const activeWork = useMemo(() => (data.jobs || []).filter((j) => String(j.scheduled_date || j.date || "").startsWith(today())).slice(0, 8), [data.jobs]);

  const saveJob = async (job, draft) => { await patch(`/jobs/${idOf(job)}`, draft); setNotice("Job saved."); load(); };
  const run = async (payload) => { await post("/command-hub/actions/execute", payload); setNotice("Action queued with owner approval."); load(); };

  const tiles = ["Jobs","Clients","Quotes","Invoices","Team","Dispatch","Proof-to-Paid","AI Receptionist","Recurring","Customer updates","Quote builder","Client Memory","Plans / Billing","Settings","Contact","Notifications","Integrations","Privacy","Terms","Account Removal"];
  if (!canUse(user?.role)) return <Layout><main className="smart-command-system"><section className="command-panel">Owner/admin only.</section></main></Layout>;

  const open = (name) => setDrawer(name);
  const list = (arr, onPick) => <div className="command-record-list">{(arr||[]).slice(0,12).map((x,i)=><button key={idOf(x)||i} className="command-record-row" onClick={()=>onPick(x)}>{x.title||x.name||x.business_name||x.invoice_number||x.quote_number||`Record ${i+1}`}</button>)}</div>;

  return <Layout smartHubMode><main className="smart-command-system"><div className="command-real-shell">
    <section className="command-zone-hero"><ChurvoxLogo size="hero"/><h1>AI Control Room</h1>{offline && <span className="command-ai-badge">AI backend offline — using local rules</span>}</section>
    <section className="command-safe-strip">No auto-send · No auto-charge · No MYOB write · No payroll changes · No deletion without owner approval.</section>
    <section className="command-zone-plan command-panel"><h2>Zone 1 · AI Today Plan</h2><p>{data.plan?.summary?.headline || "Review today's priorities."}</p><Btn onClick={()=>post('/smart-hub/scan',{})}>Run scan</Btn><Btn onClick={()=>post('/ai/operator/ask',{question:'What should I do first today?'})}>Ask AI</Btn></section>
    <section className="command-zone-next command-panel"><h2>Zone 2 · Next Best Moves</h2><p>Approve what AI prepared.</p></section>
    <section className="command-zone-active-work command-panel"><h2>Zone 3 · Active Work Board</h2><p>Work moving now</p>{list(activeWork,(j)=>setDrawer({type:'job',item:j}))}</section>
    <section className="command-zone-approvals command-panel"><h2>Zone 4 · AI Approval Control</h2><p>Approve what AI prepared</p>{list(data.actions||[],(a)=>setDrawer({type:'action',item:a}))}</section>
    <section className="command-zone-workspaces command-panel"><h2>Zone 5 · Owner Workspaces</h2><p>Open any part of the business</p><div className="command-workspace-grid">{tiles.map((t)=><button key={t} className="command-workspace-btn" onClick={()=>open(t)}>{t}</button>)}</div></section>

    {drawer && <aside className="command-drawer"><div className="command-drawer-workspace"><button onClick={()=>setDrawer(null)}>Close</button>
      {drawer.type==='job' && <div className="command-mini-editor"><h3>Jobs drawer</h3><input defaultValue={drawer.item.title||''} onBlur={(e)=>drawer.item.title=e.target.value}/><Btn onClick={()=>saveJob(drawer.item,{title:drawer.item.title,status:drawer.item.status,assigned_worker_id:drawer.item.assigned_worker_id,price:drawer.item.price,notes:drawer.item.notes})}>Save job</Btn><Btn onClick={()=>run({type:'dispatch',job_id:idOf(drawer.item)})}>Approve assignment</Btn><Btn onClick={()=>run({type:'invoice',job_id:idOf(drawer.item)})}>Create draft invoice</Btn><Btn onClick={()=>run({type:'proof',job_id:idOf(drawer.item)})}>Prepare proof pack</Btn></div>}
      {drawer.type==='action' && <div className="command-mini-editor"><h3>{drawer.item.title||'Approval'}</h3><p>{drawer.item.summary||'Review details'}</p><Btn onClick={()=>run({type:drawer.item.type,job_id:drawer.item.job_id,invoice_id:drawer.item.invoice_id,quote_id:drawer.item.quote_id})}>Approve action</Btn></div>}
      {typeof drawer==='string' && <div className="command-mini-editor"><h3>{drawer} drawer</h3><p>Usable in-drawer workspace with editable/staged controls and owner approval-first actions.</p><div className="command-workspace-form"><textarea placeholder="Notes / draft message / details"/></div><Btn>Save draft</Btn><Btn>Mark ready</Btn><button className="secondary">Open full page only if needed</button></div>}
    </div></aside>}
    {notice && <section className="command-notice">{notice}</section>}
  </div></main></Layout>;
}
