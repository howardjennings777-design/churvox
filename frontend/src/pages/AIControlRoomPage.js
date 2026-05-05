import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, patch, post } from "../lib/api";
import "../styles/aiControlRoom.css";

const ASK_PROMPTS = [
  "What should I do first?",
  "Who should I assign first?",
  "What money is waiting?",
  "What proof packs are missing?",
  "What customers need updates?",
  "What recurring work is due?",
];

const APPROVALS = [
  { key: "all", label: "All", desc: "All AI-prepared actions", icon: "⌘" },
  { key: "dispatch", label: "Dispatch", desc: "Assign crew", icon: "▦" },
  { key: "revenue", label: "Revenue", desc: "Pricing and invoices", icon: "$" },
  { key: "follow_ups", label: "Follow-ups", desc: "Quotes and invoices", icon: "✉" },
  { key: "proof", label: "Proof", desc: "Proof packs", icon: "◇" },
  { key: "receptionist", label: "Receptionist", desc: "New enquiries", icon: "☏" },
  { key: "recurring", label: "Recurring", desc: "Repeat work", icon: "↻" },
  { key: "customer_updates", label: "Customer Updates", desc: "Client messages", icon: "▣" },
  { key: "quote_builder", label: "Quote Builder", desc: "Quote drafts", icon: "□" },
  { key: "client_memory", label: "Client Memory", desc: "Notes and history", icon: "◌" },
];

const WORKSPACES = [
  { key: "jobs", label: "Jobs", icon: "▣" },
  { key: "clients", label: "Clients", icon: "◎" },
  { key: "quotes", label: "Quotes", icon: "□" },
  { key: "invoices", label: "Invoices", icon: "$" },
  { key: "team", label: "Team", icon: "◉" },
  { key: "dispatch", label: "Dispatch", icon: "▦" },
  { key: "proof_to_paid", label: "Proof to Paid", icon: "◇" },
  { key: "receptionist", label: "Receptionist", icon: "☏" },
  { key: "recurring", label: "Recurring", icon: "↻" },
  { key: "customer_updates", label: "Customer Updates", icon: "✉" },
  { key: "quote_builder", label: "Quote Builder", icon: "✦" },
  { key: "client_memory", label: "Client Memory", icon: "◌" },
  { key: "plans_billing", label: "Plans & Billing", icon: "▤" },
  { key: "account_centre", label: "Account Centre", icon: "●" },
  { key: "settings", label: "Settings", icon: "⚙" },
  { key: "contact", label: "Contact", icon: "☎" },
  { key: "notifications", label: "Notifications", icon: "◍" },
  { key: "integrations", label: "Integrations", icon: "✣" },
  { key: "privacy", label: "Privacy", icon: "◇" },
  { key: "terms", label: "Terms", icon: "▥" },
  { key: "account_removal", label: "Account Removal", icon: "!" },
];

const idOf = (x) => String(x?.id || x?._id || x?.uuid || "");
const safeArray = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : [];
const money = (v) => `$${Number(v || 0).toFixed(2)}`;
const norm = (v) => String(v || "").toLowerCase();
const titleOf = (x, fallback = "Item") => x?.title || x?.name || x?.business_name || x?.company_name || x?.invoice_number || x?.quote_number || x?.email || fallback;
const collectionFor = (data, key) => ({ jobs: data.jobs, clients: data.clients, quotes: data.quotes, invoices: data.invoices, team: data.workers, dispatch: data.jobs, proof_to_paid: data.proofPacks, receptionist: data.receptionist, recurring: data.recurring, customer_updates: data.customerUpdates, quote_builder: data.quoteDrafts, client_memory: data.clientMemory, plans_billing: [], account_centre: [], settings: [], contact: [], notifications: [], integrations: [], privacy: [], terms: [], account_removal: [] }[key] || []);

export default function AIControlRoomPage() {
  const [data, setData] = useState({ jobs: [], clients: [], invoices: [], quotes: [], workers: [], proofPacks: [], receptionist: [], recurring: [], customerUpdates: [], quoteDrafts: [], clientMemory: [], businessHealth: {} });
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
    const endpoints = ["/ai/operator/today-plan", "/command-hub/actions", "/jobs", "/clients", "/invoices", "/quotes", "/team/workers", "/proof-packs", "/ai/receptionist/enquiries", "/ai/recurring", "/ai/customer-updates", "/ai/quotes/drafts", "/ai/client-memory", "/ai/operator/business-health"];
    const results = await Promise.all(endpoints.map((p) => get(p).catch(() => null)));
    const [tp, ah, jobs, clients, invoices, quotes, workers, proofPacks, receptionist, recurring, customerUpdates, quoteDrafts, clientMemory, businessHealth] = results;
    const nextData = { jobs: safeArray(jobs), clients: safeArray(clients), invoices: safeArray(invoices), quotes: safeArray(quotes), workers: safeArray(workers), proofPacks: safeArray(proofPacks), receptionist: safeArray(receptionist), recurring: safeArray(recurring), customerUpdates: safeArray(customerUpdates), quoteDrafts: safeArray(quoteDrafts), clientMemory: safeArray(clientMemory), businessHealth: businessHealth?.data || businessHealth || {} };
    const backendActions = safeArray(ah);
    const fallbackActions = buildFallbackActions(nextData);
    const useFallback = !ah || backendActions.length === 0;
    setBackendFallback(useFallback);
    setActions(useFallback ? fallbackActions : backendActions);
    setTodayPlan(tp?.data || tp || null);
    setData(nextData);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const moneyWaiting = useMemo(() => (data.invoices || []).filter(i => ["open", "sent", "overdue", "unpaid", "pending_payment"].includes(norm(i.status))).reduce((sum, i) => sum + Number(i.balance_due ?? i.balance ?? i.amount_due ?? i.amount ?? i.total ?? 0), 0), [data.invoices]);
  const activeJobs = useMemo(() => (data.jobs || []).filter((j) => !["closed", "complete", "completed", "cancelled", "canceled"].includes(norm(j.status))).slice(0, 6), [data.jobs]);
  const counts = useMemo(() => ({ dispatch: actions.filter(a => norm(a.type).includes("dispatch")).length, revenue: actions.filter(a => ["revenue", "invoice", "pricing"].some(t => norm(a.type).includes(t))).length, follow_ups: actions.filter(a => norm(a.type).includes("follow")).length, proof: actions.filter(a => norm(a.type).includes("proof")).length, receptionist: actions.filter(a => norm(a.type).includes("reception")).length, recurring: actions.filter(a => norm(a.type).includes("recurring")).length, customer_updates: actions.filter(a => norm(a.type).includes("customer")).length, quote_builder: actions.filter(a => norm(a.type).includes("quote_builder")).length, client_memory: actions.filter(a => norm(a.type).includes("memory")).length }), [actions]);
  const best = todayPlan?.best_next_action || actions[0]?.title || "Review today’s dispatch plan";

  const openDrawer = (kind, subtitle = "") => setDrawer({ kind, subtitle });
  const openJob = (job) => { setSelectedJob(job); setJobDraft({ title: job.title || job.name || "", status: job.status || "", worker_id: job.worker_id || job.assigned_worker_id || "", price: job.price || job.fixed_price || 0, notes: job.notes || "" }); openDrawer("job", "Edit job inside Command"); };
  const executeAction = async (payload) => { try { await post("/command-hub/actions/execute", payload); setNotice("Action prepared successfully."); await loadAll(); } catch (e) { setNotice(e?.message || "Action failed."); } };
  const askAi = async (prompt) => { const p = prompt || askText; try { const r = await post("/ai/operator/ask", { question: p, prompt: p }); setAskResponse(r?.data?.answer || r?.data?.response || r?.answer || "AI answered."); } catch { setAskResponse(actions[0]?.next || actions[0]?.summary || "Fallback: start with the highest priority action."); } };
  const runAiScan = async () => { try { await post("/smart-hub/scan", {}); setNotice("AI scan complete. Control room refreshed."); await loadAll(); } catch { setNotice("AI scan could not run yet. Safe fallback is still active."); } };
  const saveJob = async () => { const id = idOf(selectedJob); if (!id) return; await patch(`/jobs/${id}`, jobDraft); setNotice("Job saved."); await loadAll(); };

  return <Layout><div className="cr-room-page">
    <section className="cr-room-hero">
      <div className="cr-room-hero-copy">
        <ChurvoxLogo size="hero" />
        <h1>AI Control Room</h1>
        <p>AI prepares the admin, dispatch, follow-ups and approvals. You review, edit and approve from one place.</p>
        <div className="cr-room-row"><button onClick={runAiScan}><span>▷</span> Run AI Plan</button><button className="cr-room-light" onClick={() => openDrawer("ask_ai", "Ask AI operator")}><span>✦</span> Ask AI Operator</button><button className="cr-room-light" onClick={() => openDrawer("approvals", "Review by category")}><span>☷</span> Open Queue</button></div>
      </div>
      <aside className="cr-room-score"><div className="cr-room-score-head"><h3>Live Control Centre</h3><span>● Live</span></div><div className="cr-room-score-grid"><ScoreTile icon="✓" label="Approvals" value={actions.length} /><ScoreTile icon="◎" label="Workers active" value={(data.workers || []).length} /><ScoreTile icon="$" label="Money waiting" value={money(moneyWaiting)} tone="orange" /><ScoreTile icon="✉" label="Follow-ups" value={counts.follow_ups} /></div></aside>
    </section>

    <section className="cr-room-safety">◇ No auto-send <span>·</span> No auto-charge <span>·</span> No MYOB write <span>·</span> No payroll changes <span>·</span> No deletion without owner approval.</section>

    <section className="cr-room-dashboard-grid">
      <div className="cr-room-zone cr-room-mission"><div className="cr-room-section-title"><span className="cr-room-icon">◎</span><h2>Today’s AI Mission</h2></div><div className="cr-room-best"><span>✦</span> Best next move: {best}</div><div className="cr-room-grid4"><Metric icon="◉" label="Need Crew" value={counts.dispatch} helper="Jobs need staff" /><Metric icon="$" label="Revenue" value={`$${moneyWaiting.toFixed(0)}`} helper="Up next to collect" /><Metric icon="✉" label="Follow-ups" value={counts.follow_ups} helper="Awaiting replies" /><Metric icon="◇" label="Proof" value={counts.proof} helper="Ready for review" /></div><div className="cr-room-row"><button onClick={() => openDrawer("work_plan", "Prepared actions")}>Work the plan →</button><button className="cr-room-light" onClick={() => openDrawer("ask_ai", "Explain plan")}>Explain plan ⓘ</button></div></div>
      <div className="cr-room-zone cr-room-next"><div className="cr-room-section-title cr-room-between"><div><span className="cr-room-icon">◌</span><h2>Next Best Moves</h2></div><button className="cr-room-link" onClick={() => openDrawer("approvals", "all")}>Open Queue →</button></div><div className="cr-room-grid3"><MoveCard title="Dispatch the day" value={`${counts.dispatch} jobs`} text="Assign crews and get jobs moving." onClick={() => openDrawer("dispatch")} accent="orange" /><MoveCard title="Move money" value={money(moneyWaiting)} text="Follow up payments and collect faster." onClick={() => openDrawer("invoices")} accent="blue" /><MoveCard title="Proof & updates" value={`${counts.proof} ready`} text="Review proof and send updates to clients." onClick={() => openDrawer("proof_to_paid")} accent="dark" /></div></div>
      <div className="cr-room-zone cr-room-board"><div className="cr-room-section-title"><span className="cr-room-icon">☷</span><h2>Active Work Board</h2></div><div className="cr-room-table"><div className="cr-room-table-head"><span>Job</span><span>Client</span><span>Assignment</span><span>Status</span><span></span></div>{activeJobs.map(j => <div key={idOf(j)} className="cr-room-table-row"><span className="cr-room-job"><i></i>{titleOf(j, `Job #${idOf(j)}`)}</span><span>{j.client_name || "Client"}</span><span className={!j.worker_name && !j.assigned_worker_name ? "risk" : ""}>{j.worker_name || j.assigned_worker_name || "Unassigned"}</span><span className={`status ${statusClass(j.status)}`}>{j.status || "Needs crew"}</span><button onClick={() => openJob(j)}>Work here</button></div>)}</div><button className="cr-room-link" onClick={() => openDrawer("jobs", "View all jobs")}>View all jobs →</button></div>
      <div className="cr-room-zone cr-room-approvals"><div className="cr-room-section-title cr-room-between"><div><span className="cr-room-icon">◇</span><h2>AI Approval Control</h2><p>Review, edit and approve AI-prepared actions.</p></div><em>{actions.length} ready</em></div><div className="cr-room-approval-grid">{APPROVALS.map(cat => <button key={cat.key} className={`cr-room-approval ${cat.key === "all" ? "active" : ""}`} onClick={() => openDrawer("approvals", cat.key)}><span>{cat.icon}</span><strong>{cat.label}</strong><b>{cat.key === "all" ? actions.length : counts[cat.key] || 0}</b></button>)}</div><button className="cr-room-link" onClick={() => openDrawer("approvals", "all")}>Open approvals queue →</button></div>
    </section>

    <section className="cr-room-zone cr-room-workspaces"><div className="cr-room-section-title"><span className="cr-room-icon">▦</span><h2>Owner Workspaces</h2><p>Everything you need, in one command centre.</p></div><div className="cr-room-workspace-grid">{WORKSPACES.map(ws => <button key={ws.key} className="cr-room-workspace" onClick={() => openDrawer(ws.key, workspaceCount(data, ws.key))}><span>{ws.icon}</span><strong>{ws.label}</strong><i>›</i></button>)}</div></section>

    {notice ? <div className="cr-room-notice">{notice}</div> : null}
    {drawer ? <Drawer drawer={drawer} close={() => setDrawer(null)} data={data} actions={actions} counts={counts} askText={askText} setAskText={setAskText} askResponse={askResponse} askAi={askAi} selectedJob={selectedJob} setJobDraft={setJobDraft} jobDraft={jobDraft} saveJob={saveJob} executeAction={executeAction} openJob={openJob} /> : null}
  </div></Layout>;
}

function ScoreTile({ icon, label, value, tone = "blue" }) { return <div className="cr-room-score-tile"><span className={tone}>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>; }
function Metric({ icon, label, value, helper }) { return <div className="cr-room-metric"><span className="cr-room-metric-icon">{icon}</span><small>{label}</small><strong>{value}</strong><em>{helper}</em></div>; }
function MoveCard({ title, value, text, onClick, accent }) { return <button className={`cr-room-move ${accent}`} onClick={onClick}><span>{accent === "orange" ? "▣" : accent === "blue" ? "$" : "◇"}</span><h3>{title}</h3><p>{text}</p><em>{value}</em></button>; }
function workspaceCount(data, key) { const items = collectionFor(data, key); if (items.length) return `${items.length} loaded`; if (["plans_billing", "account_centre", "settings", "contact", "notifications", "integrations", "privacy", "terms", "account_removal"].includes(key)) return "ready"; return "0 loaded"; }
function statusClass(v) { const s = norm(v); if (s.includes("progress")) return "blue"; if (s.includes("site") || s.includes("complete")) return "green"; if (s.includes("crew") || s.includes("assigned")) return "orange"; return "orange"; }

function Drawer({ drawer, close, data, actions, counts, askText, setAskText, askResponse, askAi, selectedJob, jobDraft, setJobDraft, saveJob, executeAction, openJob }) {
  const filteredActions = drawer.kind === "approvals" && drawer.subtitle && drawer.subtitle !== "all" ? actions.filter(a => String(a.type || "").includes(drawer.subtitle) || (drawer.subtitle === "revenue" && ["invoice", "pricing"].some(t => String(a.type || "").includes(t)))) : actions;
  return <div className="cr-room-drawer-backdrop" onClick={close}><aside className="cr-room-drawer" onClick={(e) => e.stopPropagation()}><header><div><h3>{drawer.kind.replaceAll("_", " ")}</h3><p>{drawer.subtitle || "Edit, stage, approve inside Command."}</p></div><button onClick={close}>Close</button></header><div className="cr-room-drawer-body">
    {drawer.kind === "job" && selectedJob ? <JobDrawer selectedJob={selectedJob} jobDraft={jobDraft} setJobDraft={setJobDraft} data={data} saveJob={saveJob} executeAction={executeAction} /> : null}
    {drawer.kind === "ask_ai" ? <AskDrawer askText={askText} setAskText={setAskText} askResponse={askResponse} askAi={askAi} /> : null}
    {drawer.kind === "approvals" ? <ApprovalDrawer actions={filteredActions} executeAction={executeAction} openJob={openJob} /> : null}
    {drawer.kind !== "job" && drawer.kind !== "ask_ai" && drawer.kind !== "approvals" ? <GenericWorkspace drawer={drawer} data={data} counts={counts} executeAction={executeAction} openJob={openJob} askAi={askAi} /> : null}
  </div></aside></div>;
}

function JobDrawer({ selectedJob, jobDraft, setJobDraft, data, saveJob, executeAction }) {
  const jobId = idOf(selectedJob);
  return <div className="cr-room-form"><div className="cr-room-drawer-card"><h4>{titleOf(selectedJob, "Job")}</h4><p>Change the job here, then approve the action you want Churvox to perform.</p></div>{["title", "status", "price", "notes"].map(k => <label key={k}>{k}<input value={jobDraft[k] ?? ""} onChange={(e) => setJobDraft(s => ({ ...s, [k]: e.target.value }))} /></label>)}<label>worker<select value={jobDraft.worker_id || ""} onChange={(e) => setJobDraft(s => ({ ...s, worker_id: e.target.value }))}><option value="">Unassigned</option>{(data.workers || []).map(w => <option key={idOf(w)} value={idOf(w)}>{w.name || w.email}</option>)}</select></label><div className="cr-room-row"><button onClick={saveJob}>Save job</button><button onClick={() => executeAction({ action_type: "dispatch", type: "dispatch", job_id: jobId, worker_id: jobDraft.worker_id })}>Approve assignment</button><button onClick={() => executeAction({ action_type: "invoice", type: "revenue", job_id: jobId })}>Create draft invoice</button><button onClick={() => executeAction({ action_type: "proof", type: "proof", job_id: jobId })}>Prepare proof pack</button></div></div>;
}

function AskDrawer({ askText, setAskText, askResponse, askAi }) {
  return <div className="cr-room-form"><label>Ask AI Operator<textarea value={askText} onChange={(e) => setAskText(e.target.value)} /></label><div className="cr-room-row">{ASK_PROMPTS.map(p => <button key={p} onClick={() => setAskText(p)}>{p}</button>)}</div><button onClick={() => askAi()}>Ask AI</button>{askResponse ? <div className="cr-room-drawer-card"><p>{askResponse}</p></div> : null}</div>;
}

function ApprovalDrawer({ actions, executeAction, openJob }) {
  return <div className="cr-room-card-list">{actions.length ? actions.map(a => <article key={a.id} className="cr-room-action"><span className="cr-room-pill">{a.priority || "review"}</span><h3>{a.title}</h3><p>{a.summary}</p><p><strong>Why:</strong> {a.reason}</p><div className="cr-room-row">{a.job_id ? <button onClick={() => openJob({ id: a.job_id, title: a.title, status: "review" })}>Edit job first</button> : null}<button onClick={() => executeAction({ action_type: a.type, type: a.type, job_id: a.job_id, invoice_id: a.invoice_id, quote_id: a.quote_id, client_id: a.client_id, payload: a })}>Approve action</button></div></article>) : <div className="cr-room-drawer-card"><p>No actions in this group yet.</p></div>}</div>;
}

function GenericWorkspace({ drawer, data, counts, executeAction, openJob, askAi }) {
  const [draft, setDraft] = useState({ title: "", customer: "", amount: "", notes: "", message: "", status: "draft" });
  const items = collectionFor(data, drawer.kind).slice(0, 8);
  return <div className="cr-room-form"><div className="cr-room-drawer-card"><h4>{drawer.kind.replaceAll("_", " ")}</h4><p>{drawer.subtitle || "Work here first. Stage, edit, ask AI, then approve."}</p><div className="cr-room-mini-stats"><span>{items.length} records</span><span>{counts?.dispatch || 0} dispatch</span><span>{counts?.follow_ups || 0} follow-ups</span></div></div>{items.length ? <div className="cr-room-list">{items.map((x, i) => <div key={idOf(x) || i} className="cr-room-list-row"><div><strong>{titleOf(x, `Item ${i + 1}`)}</strong><p>{x.status || x.email || x.phone || "ready"}</p></div>{drawer.kind === "jobs" || drawer.kind === "dispatch" ? <button onClick={() => openJob(x)}>Work here</button> : <button onClick={() => executeAction({ action_type: drawer.kind, type: drawer.kind, payload: x })}>Stage</button>}</div>)}</div> : null}<label>title / customer<input value={draft.title} onChange={(e) => setDraft(s => ({ ...s, title: e.target.value }))} /></label><label>amount / status<input value={draft.amount} onChange={(e) => setDraft(s => ({ ...s, amount: e.target.value }))} /></label><label>notes<textarea value={draft.notes} onChange={(e) => setDraft(s => ({ ...s, notes: e.target.value }))} /></label><div className="cr-room-row"><button onClick={() => askAi(`Prepare ${drawer.kind.replaceAll("_", " ")} work from this draft: ${draft.title} ${draft.notes}`)}>Ask AI to prepare</button><button onClick={() => executeAction({ action_type: drawer.kind, type: drawer.kind, payload: draft })}>Stage for approval</button></div></div>;
}

function buildFallbackActions({ jobs, invoices, quotes, proofPacks, receptionist, recurring, customerUpdates, quoteDrafts, clientMemory }) {
  const out = [];
  jobs.forEach((j) => { const status = norm(j.status); const jobId = idOf(j); if (!j.worker_id && !j.assigned_worker_id && !["closed", "complete", "completed"].includes(status)) out.push({ id: `dispatch-${jobId}`, type: "dispatch", priority: "high", title: `Assign worker for ${titleOf(j, `Job ${jobId}`)}`, summary: "Job has no assigned worker.", reason: "Unassigned active job.", next: "Pick worker and approve assignment.", job_id: jobId, client_id: j.client_id }); if (["complete", "completed"].includes(status)) { const hasInvoice = invoices.some((i) => String(i.job_id) === jobId); if (!hasInvoice) out.push({ id: `invoice-${jobId}`, type: Number(j.price || j.fixed_price || 0) > 0 ? "revenue" : "pricing", priority: "high", title: Number(j.price || j.fixed_price || 0) > 0 ? "Create draft invoice" : "Set job price", summary: "Completed job has no invoice.", reason: "Revenue not captured.", next: Number(j.price || j.fixed_price || 0) > 0 ? "Prepare draft invoice." : "Set price then invoice.", job_id: jobId, client_id: j.client_id }); const hasProof = proofPacks.some((p) => String(p.job_id) === jobId); if (!hasProof) out.push({ id: `proof-${jobId}`, type: "proof", priority: "medium", title: "Prepare proof pack", summary: "Completed job missing proof.", reason: "Customer update and payment support.", next: "Prepare proof and draft message.", job_id: jobId }); } });
  invoices.filter(i => ["open", "sent", "overdue", "unpaid", "pending_payment"].includes(norm(i.status))).forEach(i => out.push({ id: `inv-fu-${idOf(i)}`, type: "follow_ups", priority: "high", title: "Invoice follow-up", summary: "Money is waiting on invoice.", reason: `Status ${i.status}.`, next: "Prepare reminder.", invoice_id: idOf(i), client_id: i.client_id }));
  quotes.filter(q => ["sent", "pending", "waiting", "viewed", "draft"].includes(norm(q.status))).forEach(q => out.push({ id: `quote-fu-${idOf(q)}`, type: "follow_ups", priority: "medium", title: "Quote follow-up", summary: "Quote needs action.", reason: `Status ${q.status}.`, next: "Prepare quote follow-up.", quote_id: idOf(q), client_id: q.client_id }));
  receptionist.forEach((r, i) => out.push({ id: `reception-${idOf(r) || i}`, type: "receptionist", priority: "medium", title: "Review enquiry", summary: r.message || "New enquiry", reason: "Receptionist capture pending review.", next: "Prepare client/job/quote draft.", client_id: r.client_id }));
  recurring.forEach((r, i) => out.push({ id: `recurring-${idOf(r) || i}`, type: "recurring", priority: "medium", title: "Recurring work due", summary: r.frequency || "Recurring item", reason: "Schedule needs owner review.", next: "Prepare next job.", client_id: r.client_id }));
  customerUpdates.forEach((r, i) => out.push({ id: `customer-${idOf(r) || i}`, type: "customer_updates", priority: "low", title: "Customer update draft", summary: r.message || "Draft update", reason: "Customer communication queue.", next: "Prepare update.", client_id: r.client_id, job_id: r.job_id }));
  quoteDrafts.forEach((r, i) => out.push({ id: `qb-${idOf(r) || i}`, type: "quote_builder", priority: "low", title: "Review quote draft", summary: r.title || "Quote draft", reason: "AI quote builder output.", next: "Edit and stage quote.", quote_id: idOf(r), client_id: r.client_id }));
  clientMemory.forEach((r, i) => out.push({ id: `memory-${idOf(r) || i}`, type: "client_memory", priority: "low", title: "Review client memory", summary: r.note || "Memory item", reason: "Client context can improve service.", next: "Save/stage memory.", client_id: r.client_id }));
  return out;
}
