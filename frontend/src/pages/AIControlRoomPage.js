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
  { key: "all", label: "All approvals", desc: "Everything AI prepared" },
  { key: "dispatch", label: "Dispatch", desc: "Assign crew and keep jobs moving" },
  { key: "revenue", label: "Revenue", desc: "Pricing and draft invoices" },
  { key: "follow_ups", label: "Follow-ups", desc: "Invoice and quote reminders" },
  { key: "proof", label: "Proof", desc: "Proof packs before payment" },
  { key: "receptionist", label: "Receptionist", desc: "New enquiries to triage" },
  { key: "recurring", label: "Recurring", desc: "Repeat work due next" },
  { key: "customer_updates", label: "Customer updates", desc: "Draft messages to approve" },
  { key: "quote_builder", label: "Quote builder", desc: "Prepared quote drafts" },
  { key: "client_memory", label: "Client memory", desc: "Notes and next actions" },
];

const WORKSPACES = [
  { key: "jobs", label: "Jobs", desc: "Create, edit, assign, price" },
  { key: "clients", label: "Clients", desc: "Customers, properties, notes" },
  { key: "quotes", label: "Quotes", desc: "Draft, follow up, convert" },
  { key: "invoices", label: "Invoices", desc: "Drafts, reminders, payment chase" },
  { key: "team", label: "Team", desc: "Workers, roles, workload" },
  { key: "dispatch", label: "Dispatch", desc: "AI crew recommendations" },
  { key: "proof_to_paid", label: "Proof-to-Paid", desc: "Proof, updates, payment flow" },
  { key: "receptionist", label: "Receptionist", desc: "Enquiries into work drafts" },
  { key: "recurring", label: "Recurring", desc: "Scheduled repeat work" },
  { key: "customer_updates", label: "Customer Updates", desc: "Approval-first messages" },
  { key: "quote_builder", label: "Quote Builder", desc: "Build quotes with AI" },
  { key: "client_memory", label: "Client Memory", desc: "History and property notes" },
  { key: "plans_billing", label: "Plans / Billing", desc: "Plan, limits, usage" },
  { key: "account_centre", label: "Account Centre", desc: "Owner account health" },
  { key: "settings", label: "Settings", desc: "Business setup" },
  { key: "contact", label: "Contact Us", desc: "Support request draft" },
  { key: "notifications", label: "Notifications", desc: "Owner alert controls" },
  { key: "integrations", label: "Integrations", desc: "MYOB, SMS, payments" },
  { key: "privacy", label: "Privacy", desc: "Policy and privacy notes" },
  { key: "terms", label: "Terms", desc: "Terms and owner notes" },
  { key: "account_removal", label: "Account Removal", desc: "Manual owner-only action" },
];

const idOf = (x) => String(x?.id || x?._id || x?.uuid || "");
const safeArray = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : [];
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
  const activeJobs = useMemo(() => (data.jobs || []).filter((j) => !["closed", "complete", "completed", "cancelled", "canceled"].includes(norm(j.status))).slice(0, 8), [data.jobs]);
  const counts = useMemo(() => ({ dispatch: actions.filter(a => norm(a.type).includes("dispatch")).length, revenue: actions.filter(a => ["revenue", "invoice", "pricing"].some(t => norm(a.type).includes(t))).length, follow_ups: actions.filter(a => norm(a.type).includes("follow")).length, proof: actions.filter(a => norm(a.type).includes("proof")).length, receptionist: actions.filter(a => norm(a.type).includes("reception")).length, recurring: actions.filter(a => norm(a.type).includes("recurring")).length, customer_updates: actions.filter(a => norm(a.type).includes("customer")).length, quote_builder: actions.filter(a => norm(a.type).includes("quote_builder")).length, client_memory: actions.filter(a => norm(a.type).includes("memory")).length }), [actions]);
  const best = todayPlan?.best_next_action || actions[0]?.title || "Review today’s dispatch plan";

  const openDrawer = (kind, subtitle = "") => setDrawer({ kind, subtitle });
  const openJob = (job) => { setSelectedJob(job); setJobDraft({ title: job.title || job.name || "", status: job.status || "", worker_id: job.worker_id || job.assigned_worker_id || "", price: job.price || job.fixed_price || 0, notes: job.notes || "" }); openDrawer("job", "Edit job inside Command"); };
  const executeAction = async (payload) => { try { await post("/command-hub/actions/execute", payload); setNotice("Action prepared successfully."); await loadAll(); } catch (e) { setNotice(e?.message || "Action failed."); } };
  const askAi = async (prompt) => { const p = prompt || askText; try { const r = await post("/ai/operator/ask", { question: p, prompt: p }); setAskResponse(r?.data?.answer || r?.data?.response || r?.answer || "AI answered."); } catch { setAskResponse(actions[0]?.next || actions[0]?.summary || "Fallback: start with the highest priority action."); } };
  const saveJob = async () => { const id = idOf(selectedJob); if (!id) return; await patch(`/jobs/${id}`, jobDraft); setNotice("Job saved."); await loadAll(); };

  return <Layout><div className="cr-room-page">
    <section className="cr-room-hero">
      <div>
        <ChurvoxLogo size="hero" />
        <p className="cr-room-kicker">AI Operator</p>
        <h1>AI Control Room</h1>
        <p>AI prepares the admin, dispatch, proof, invoices, follow-ups and customer work. Owner edits and approves inside drawers. Churvox executes safely.</p>
        <div className="cr-room-row"><button onClick={() => post("/smart-hub/scan", {}).catch(() => null)}>Run AI scan</button><button onClick={() => openDrawer("ask_ai", "Ask AI operator")}>Ask AI</button><button onClick={() => openDrawer("approvals", "Review by category")}>Open approvals</button></div>
      </div>
      <aside className="cr-room-score"><h3>Live score</h3><p>Approvals: {actions.length}</p><p>Workers active: {(data.workers || []).length}</p><p>Money waiting: {money(moneyWaiting)}</p><p>Status: {backendFallback ? "backend AI fallback mode" : "live backend AI"}</p></aside>
    </section>

    <section className="cr-room-safety">No auto-send · No auto-charge · No MYOB write · No payroll changes · No deletion without owner approval.</section>

    <section className="cr-room-zone cr-room-plan"><p className="cr-room-zone-label">Zone 1 · AI Today Plan</p><h2>{best}</h2><p>{todayPlan?.reason || actions[0]?.reason || "AI is using your live business data and safe local fallback rules."}</p><div className="cr-room-grid4"><Metric label="Need crew" value={counts.dispatch} /><Metric label="Revenue" value={`$${moneyWaiting.toFixed(0)}`} /><Metric label="Follow-ups" value={counts.follow_ups} /><Metric label="Proof" value={counts.proof} /></div><div className="cr-room-row"><button onClick={() => openDrawer("work_plan", "Prepared actions")}>Work plan</button><button onClick={() => openDrawer("ask_ai", "Explain plan")}>Explain plan</button></div></section>

    <section className="cr-room-zone"><p className="cr-room-zone-label">Zone 2 · Next Best Moves</p><h2>Choose the next business move</h2><div className="cr-room-grid3"><MoveCard title="Dispatch the day" value={counts.dispatch} text="Assign workers and unblock today’s jobs" onClick={() => openDrawer("dispatch")} /><MoveCard title="Move money" value={counts.revenue + counts.follow_ups} text="Draft invoices and follow-ups" onClick={() => openDrawer("invoices")} /><MoveCard title="Proof & updates" value={counts.proof + counts.customer_updates} text="Prepare proof packs and customer updates" onClick={() => openDrawer("proof_to_paid")} /></div></section>

    <section className="cr-room-zone"><p className="cr-room-zone-label">Zone 3 · Active Work Board</p><h2>Jobs moving now</h2><div className="cr-room-list">{activeJobs.map(j => <div key={idOf(j)} className="cr-room-list-row"><div><strong>{titleOf(j, `Job #${idOf(j)}`)}</strong><p>{j.client_name || "Client"} · {j.status || "status"} · {j.worker_name || j.assigned_worker_name || "Unassigned"}</p></div><button onClick={() => openJob(j)}>Work here</button></div>)}</div></section>

    <section className="cr-room-zone"><p className="cr-room-zone-label">Zone 4 · AI Approval Control</p><h2>Approve what AI prepared</h2><div className="cr-room-grid5">{APPROVALS.map(cat => <button key={cat.key} className="cr-room-approval" onClick={() => openDrawer("approvals", cat.key)}><strong>{cat.label}</strong><span>{cat.desc}</span><em>{cat.key === "all" ? actions.length : counts[cat.key] || 0} ready</em></button>)}</div></section>

    <section className="cr-room-zone"><p className="cr-room-zone-label">Zone 5 · Owner Workspaces</p><h2>Run every area from one hub</h2><div className="cr-room-grid5">{WORKSPACES.map(ws => <button key={ws.key} className="cr-room-workspace" onClick={() => openDrawer(ws.key, ws.desc)}><strong>{ws.label}</strong><span>{ws.desc}</span><em>{workspaceCount(data, ws.key)}</em></button>)}</div></section>

    {notice ? <div className="cr-room-notice">{notice}</div> : null}
    {drawer ? <Drawer drawer={drawer} close={() => setDrawer(null)} data={data} actions={actions} counts={counts} askText={askText} setAskText={setAskText} askResponse={askResponse} askAi={askAi} selectedJob={selectedJob} setJobDraft={setJobDraft} jobDraft={jobDraft} saveJob={saveJob} executeAction={executeAction} openJob={openJob} /> : null}
  </div></Layout>;
}

function Metric({ label, value }) { return <div className="cr-room-metric"><span>{label}</span><strong>{value}</strong></div>; }
function MoveCard({ title, value, text, onClick }) { return <button className="cr-room-card" onClick={onClick}><small>Next move</small><h3>{title}</h3><b>{value}</b><p>{text}</p></button>; }
function workspaceCount(data, key) { const items = collectionFor(data, key); if (items.length) return `${items.length} loaded`; if (["plans_billing", "account_centre", "settings", "contact", "notifications", "integrations", "privacy", "terms", "account_removal"].includes(key)) return "ready"; return "0 loaded"; }

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
