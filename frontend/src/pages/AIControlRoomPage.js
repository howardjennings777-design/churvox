import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import api, { get, patch, post } from "../lib/api";
import "../styles/aiControlRoom.css";

const ASK_PROMPTS = [
  "What should I do first?",
  "Who should I assign first?",
  "What money is waiting?",
  "What proof packs are missing?",
  "What customers need updates?",
  "What recurring work is due?",
];

const APPROVAL_CATEGORIES = ["all","dispatch","revenue","follow_ups","proof","receptionist","recurring","customer_updates","quote_builder","client_memory"];

const WORKSPACES = ["jobs","clients","quotes","invoices","team","dispatch","proof_to_paid","receptionist","recurring","customer_updates","quote_builder","client_memory","plans_billing","account_centre","settings","contact","notifications","integrations","privacy","terms","account_removal"];

const safeArray = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

export default function AIControlRoomPage() {
  const [data, setData] = useState({});
  const [todayPlan, setTodayPlan] = useState(null);
  const [actions, setActions] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDraft, setJobDraft] = useState({});
  const [askText, setAskText] = useState(ASK_PROMPTS[0]);
  const [askResponse, setAskResponse] = useState("");
  const [notice, setNotice] = useState("");
  const [backendFallback, setBackendFallback] = useState(false);

  const loadAll = useCallback(async () => {
    const endpoints = ["/ai/operator/today-plan","/command-hub/actions","/jobs","/clients","/invoices","/quotes","/team/workers","/proof-packs","/ai/receptionist/enquiries","/ai/recurring","/ai/customer-updates","/ai/quotes/drafts","/ai/client-memory","/ai/operator/business-health"];
    const results = await Promise.all(endpoints.map((p) => get(p).catch(() => null)));
    const [tp, ah, jobs, clients, invoices, quotes, workers, proofPacks, receptionist, recurring, customerUpdates, quoteDrafts, clientMemory, businessHealth] = results;
    const jobsArr = safeArray(jobs);
    const invoicesArr = safeArray(invoices);
    const quotesArr = safeArray(quotes);
    const proofArr = safeArray(proofPacks);
    const backendActions = safeArray(ah);
    const fallbackActions = buildFallbackActions({ jobs: jobsArr, invoices: invoicesArr, quotes: quotesArr, proofPacks: proofArr, receptionist: safeArray(receptionist), recurring: safeArray(recurring), customerUpdates: safeArray(customerUpdates), quoteDrafts: safeArray(quoteDrafts), clientMemory: safeArray(clientMemory) });
    const useFallback = !ah || backendActions.length === 0;
    setBackendFallback(useFallback);
    setActions(useFallback ? fallbackActions : backendActions);
    setTodayPlan(tp?.data || tp || null);
    setData({ jobs: jobsArr, clients: safeArray(clients), invoices: invoicesArr, quotes: quotesArr, workers: safeArray(workers), proofPacks: proofArr, receptionist: safeArray(receptionist), recurring: safeArray(recurring), customerUpdates: safeArray(customerUpdates), quoteDrafts: safeArray(quoteDrafts), clientMemory: safeArray(clientMemory), businessHealth: businessHealth?.data || businessHealth || {} });
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const moneyWaiting = useMemo(() => (data.invoices || []).filter(i => ["open","sent","overdue","unpaid","pending_payment"].includes(String(i.status || "").toLowerCase())).reduce((sum, i) => sum + Number(i.amount || i.total || 0), 0), [data.invoices]);

  const activeJobs = useMemo(() => (data.jobs || []).filter((j) => !["closed","complete","completed"].includes(String(j.status || "").toLowerCase())).slice(0, 8), [data.jobs]);

  const openDrawer = (kind, subtitle = "") => setDrawer({ kind, subtitle });

  const executeAction = async (payload) => {
    try { await post("/command-hub/actions/execute", payload); setNotice("Action prepared successfully."); await loadAll(); }
    catch (e) { setNotice(e?.message || "Action failed."); }
  };

  const askAi = async (prompt) => {
    const p = prompt || askText;
    try { const r = await post("/ai/operator/ask", { question: p, prompt: p }); setAskResponse(r?.data?.answer || r?.data?.response || r?.answer || "AI answered."); }
    catch { setAskResponse(actions[0]?.next || actions[0]?.summary || "Fallback: start with highest priority dispatch action."); }
  };

  const saveJob = async () => { if (!selectedJob?.id) return; await patch(`/jobs/${selectedJob.id}`, jobDraft); setNotice("Job saved."); await loadAll(); };

  return <Layout><div className="cr-room-page">
    <section className="cr-room-hero">
      <div><ChurvoxLogo size="hero" /><h1>AI Control Room</h1><p>AI prepares the admin. Owner edits, approves, and Churvox executes.</p><div className="cr-room-row"><button onClick={() => post("/smart-hub/scan", {}).catch(() => null)}>Run AI scan</button><button onClick={() => openDrawer("ask_ai", "Ask AI operator")}>Ask AI</button><button onClick={() => openDrawer("approvals", "Review by category")}>Open approvals</button></div></div>
      <aside className="cr-room-score"><h3>Live score</h3><p>Approvals: {actions.length}</p><p>Workers active: {(data.workers || []).length}</p><p>Money waiting: ${moneyWaiting.toFixed(2)}</p><p>Status: {backendFallback ? "backend AI fallback mode" : "live backend AI"}</p></aside>
    </section>
    <section className="cr-room-safety">No auto-send · No auto-charge · No MYOB write · No payroll changes · No deletion without owner approval.</section>
    <section className="cr-room-zone"><h2>AI Today Plan</h2><div className="cr-room-card"><h3>{todayPlan?.best_next_action || actions[0]?.title || "Review dispatch"}</h3><p><strong>Reason:</strong> {todayPlan?.reason || actions[0]?.reason || "No reason from backend yet."}</p><p><strong>What happens next:</strong> {todayPlan?.next || actions[0]?.next || "Owner approves action in drawer."}</p><div className="cr-room-grid4"><Metric label="Need crew" value={(actions || []).filter(a => String(a.type).includes("dispatch")).length} /><Metric label="Revenue" value={`$${moneyWaiting.toFixed(0)}`} /><Metric label="Follow-ups" value={(actions || []).filter(a => String(a.type).includes("follow")).length} /><Metric label="Proof" value={(actions || []).filter(a => String(a.type).includes("proof")).length} /></div><div className="cr-room-row"><button onClick={() => openDrawer("work_plan", "Prepared actions")}>Work plan</button><button onClick={() => openDrawer("ask_ai", "Explain plan")}>Explain plan</button></div></div></section>
    <section className="cr-room-zone"><h2>Next Best Moves</h2><div className="cr-room-grid3"><Card title="Dispatch the day" onClick={() => openDrawer("dispatch")} /><Card title="Move money" onClick={() => openDrawer("invoices")} /><Card title="Proof & updates" onClick={() => openDrawer("proof_to_paid")} /></div></section>
    <section className="cr-room-zone"><h2>Active Work Board</h2><div className="cr-room-list">{activeJobs.map(j => <div key={j.id} className="cr-room-list-row"><div><strong>{j.title || j.name || `Job #${j.id}`}</strong><p>{j.client_name || "Client"} · {j.status || "status"} · {j.worker_name || "Unassigned"}</p></div><button onClick={() => { setSelectedJob(j); setJobDraft({ title: j.title || j.name || "", status: j.status || "", worker_id: j.worker_id || "", price: j.price || 0, notes: j.notes || "" }); openDrawer("job"); }}>Work here</button></div>)}</div></section>
    <section className="cr-room-zone"><h2>AI Approval Control</h2><div className="cr-room-grid5">{APPROVAL_CATEGORIES.map(cat => <button key={cat} className="cr-room-approval" onClick={() => openDrawer("approvals", cat)}>{cat.replaceAll("_", " ")}</button>)}</div></section>
    <section className="cr-room-zone"><h2>Owner Workspaces</h2><div className="cr-room-grid5">{WORKSPACES.map(ws => <button key={ws} className="cr-room-workspace" onClick={() => openDrawer(ws)}>{ws.replaceAll("_", " ")}</button>)}</div></section>
    {notice ? <div className="cr-room-notice">{notice}</div> : null}
    {drawer ? <Drawer drawer={drawer} close={() => setDrawer(null)} data={data} actions={actions} askText={askText} setAskText={setAskText} askResponse={askResponse} askAi={askAi} selectedJob={selectedJob} setJobDraft={setJobDraft} jobDraft={jobDraft} saveJob={saveJob} executeAction={executeAction} /> : null}
  </div></Layout>;
}

function Metric({ label, value }) { return <div className="cr-room-metric"><span>{label}</span><strong>{value}</strong></div>; }
function Card({ title, onClick }) { return <button className="cr-room-card" onClick={onClick}><h3>{title}</h3><p>Open drawer and prepare editable work.</p></button>; }

function Drawer({ drawer, close, data, actions, askText, setAskText, askResponse, askAi, selectedJob, jobDraft, setJobDraft, saveJob, executeAction }) {
  const filteredActions = drawer.kind === "approvals" && drawer.subtitle && drawer.subtitle !== "all" ? actions.filter(a => String(a.type || "").includes(drawer.subtitle)) : actions;
  return <div className="cr-room-drawer-backdrop" onClick={close}><aside className="cr-room-drawer" onClick={(e) => e.stopPropagation()}><header><h3>{drawer.kind.replaceAll("_", " ")}</h3><p>{drawer.subtitle || "Edit, stage, approve."}</p><button onClick={close}>Close</button></header><div className="cr-room-drawer-body">
    {drawer.kind === "job" && selectedJob ? <div className="cr-room-form">{["title","status","price","notes"].map(k => <label key={k}>{k}<input value={jobDraft[k] ?? ""} onChange={(e) => setJobDraft(s => ({ ...s, [k]: e.target.value }))} /></label>)}<label>worker<select value={jobDraft.worker_id || ""} onChange={(e) => setJobDraft(s => ({ ...s, worker_id: e.target.value }))}><option value="">Unassigned</option>{(data.workers||[]).map(w => <option key={w.id} value={w.id}>{w.name || w.email}</option>)}</select></label><div className="cr-room-row"><button onClick={saveJob}>Save job</button><button onClick={() => executeAction({ action_type: "dispatch", type: "dispatch", job_id: selectedJob.id, worker_id: jobDraft.worker_id })}>Approve assignment</button><button onClick={() => executeAction({ action_type: "invoice", type: "revenue", job_id: selectedJob.id })}>Create draft invoice</button><button onClick={() => executeAction({ action_type: "proof", type: "proof", job_id: selectedJob.id })}>Prepare proof pack</button></div></div> : null}
    {drawer.kind === "ask_ai" ? <div><textarea value={askText} onChange={(e) => setAskText(e.target.value)} /><div className="cr-room-row">{ASK_PROMPTS.map(p => <button key={p} onClick={() => setAskText(p)}>{p}</button>)}</div><button onClick={() => askAi()}>Ask</button><p>{askResponse}</p></div> : null}
    {drawer.kind === "approvals" ? <div>{filteredActions.map(a => <div key={a.id} className="cr-room-list-row"><div><strong>{a.title}</strong><p>{a.summary}</p><p>{a.reason}</p></div><button onClick={() => executeAction({ action_type: a.type, type: a.type, job_id: a.job_id, invoice_id: a.invoice_id, quote_id: a.quote_id, client_id: a.client_id, payload: a })}>Approve</button></div>)}</div> : null}
    {drawer.kind !== "job" && drawer.kind !== "ask_ai" && drawer.kind !== "approvals" ? <GenericWorkspace drawer={drawer} data={data} executeAction={executeAction} /> : null}
  </div></aside></div>;
}

function GenericWorkspace({ drawer, data, executeAction }) { return <div><p>Workspace for {drawer.kind.replaceAll("_", " ")}.</p><p>All actions here are staged for owner approval.</p><button onClick={() => executeAction({ action_type: drawer.kind, type: drawer.kind, payload: { staged: true } })}>Stage action</button><div className="cr-room-list">{(data[drawer.kind] || data.jobs || []).slice(0, 6).map((x, i) => <div key={x.id || i} className="cr-room-list-row"><span>{x.title || x.name || x.email || `Item ${i+1}`}</span><span>{x.status || x.phone || "staged"}</span></div>)}</div></div>; }

function buildFallbackActions({ jobs, invoices, quotes, proofPacks, receptionist, recurring, customerUpdates, quoteDrafts, clientMemory }) {
  const out = [];
  jobs.forEach((j) => { const status = String(j.status || "").toLowerCase(); if (!j.worker_id && !["closed","complete","completed"].includes(status)) out.push({ id: `dispatch-${j.id}`, type: "dispatch", priority: "high", title: `Assign worker for ${j.title || j.name || `Job ${j.id}`}`, summary: "Job has no assigned worker.", reason: "Unassigned active job.", next: "Pick worker and approve assignment.", job_id: j.id, client_id: j.client_id }); if (["complete","completed"].includes(status)) { const hasInvoice = invoices.some((i) => Number(i.job_id) === Number(j.id)); if (!hasInvoice) out.push({ id: `invoice-${j.id}`, type: Number(j.price || 0) > 0 ? "revenue" : "pricing", priority: "high", title: Number(j.price || 0) > 0 ? "Create draft invoice" : "Set job price", summary: "Completed job has no invoice.", reason: "Revenue not captured.", next: Number(j.price || 0) > 0 ? "Prepare draft invoice." : "Set price then invoice.", job_id: j.id, client_id: j.client_id }); const hasProof = proofPacks.some((p) => Number(p.job_id) === Number(j.id)); if (!hasProof) out.push({ id: `proof-${j.id}`, type: "proof", priority: "medium", title: "Prepare proof pack", summary: "Completed job missing proof.", reason: "Customer update and payment support.", next: "Prepare proof and draft message.", job_id: j.id }); } });
  invoices.filter(i => ["open","sent","overdue","unpaid","pending_payment"].includes(String(i.status||"").toLowerCase())).forEach(i => out.push({ id: `inv-fu-${i.id}`, type: "follow_ups", priority: "high", title: "Invoice follow-up", summary: "Money is waiting on invoice.", reason: `Status ${i.status}.`, next: "Prepare reminder.", invoice_id: i.id, client_id: i.client_id }));
  quotes.filter(q => ["sent","pending","waiting","viewed","draft"].includes(String(q.status||"").toLowerCase())).forEach(q => out.push({ id: `quote-fu-${q.id}`, type: "follow_ups", priority: "medium", title: "Quote follow-up", summary: "Quote needs action.", reason: `Status ${q.status}.`, next: "Prepare quote follow-up.", quote_id: q.id, client_id: q.client_id }));
  receptionist.forEach((r, i) => out.push({ id:`reception-${r.id||i}`, type:"receptionist", priority:"medium", title:"Review enquiry", summary:r.message||"New enquiry", reason:"Receptionist capture pending review.", next:"Prepare client/job/quote draft.", client_id:r.client_id }));
  recurring.forEach((r, i) => out.push({ id:`recurring-${r.id||i}`, type:"recurring", priority:"medium", title:"Recurring work due", summary:r.frequency||"Recurring item", reason:"Schedule needs owner review.", next:"Prepare next job.", client_id:r.client_id }));
  customerUpdates.forEach((r, i) => out.push({ id:`customer-${r.id||i}`, type:"customer_updates", priority:"low", title:"Customer update draft", summary:r.message||"Draft update", reason:"Customer communication queue.", next:"Prepare update.", client_id:r.client_id, job_id:r.job_id }));
  quoteDrafts.forEach((r, i) => out.push({ id:`qb-${r.id||i}`, type:"quote_builder", priority:"low", title:"Review quote draft", summary:r.title||"Quote draft", reason:"AI quote builder output.", next:"Edit and stage quote.", quote_id:r.id, client_id:r.client_id }));
  clientMemory.forEach((r, i) => out.push({ id:`memory-${r.id||i}`, type:"client_memory", priority:"low", title:"Review client memory", summary:r.note||"Memory item", reason:"Client context can improve service.", next:"Save/stage memory.", client_id:r.client_id }));
  return out;
}
