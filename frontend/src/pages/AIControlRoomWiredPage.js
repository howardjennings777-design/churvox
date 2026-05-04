import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post, patch } from "../lib/api";
import "../styles/aiControlRoom.css";

const STAGED_KEY = "churvox_control_room_staged";
const norm = (v) => String(v || "").toLowerCase();
const idOf = (x) => String(x?.id || x?._id || x?.uuid || "");
const titleOf = (x, f = "Item") => x?.title || x?.name || x?.business_name || x?.company_name || x?.invoice_number || x?.quote_number || x?.email || f;
const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : Array.isArray(v?.proof_packs) ? v.proof_packs : Array.isArray(v?.enquiries) ? v.enquiries : Array.isArray(v?.updates) ? v.updates : Array.isArray(v?.drafts) ? v.drafts : Array.isArray(v?.rules) ? v.rules : [];
const money = (v) => `$${Number(v || 0).toFixed(2)}`;

const approvals = [
  ["all", "All approvals", "Everything AI prepared"],
  ["dispatch", "Dispatch", "Assign crew and keep jobs moving"],
  ["revenue", "Revenue", "Pricing and draft invoices"],
  ["follow", "Follow-ups", "Invoice and quote reminders"],
  ["proof", "Proof", "Proof packs before payment"],
  ["reception", "Receptionist", "New enquiries to triage"],
  ["recurring", "Recurring", "Repeat work due next"],
  ["customer", "Customer updates", "Draft messages to approve"],
  ["quote_builder", "Quote builder", "Prepared quote drafts"],
  ["memory", "Client memory", "Notes and next actions"],
];

const workspaces = [
  ["jobs", "Jobs", "Create, edit, assign, price"],
  ["clients", "Clients", "Customers, properties, notes"],
  ["quotes", "Quotes", "Draft, follow up, convert"],
  ["invoices", "Invoices", "Drafts, reminders, payment chase"],
  ["team", "Team", "Workers, roles, workload"],
  ["dispatch", "Dispatch", "AI crew recommendations"],
  ["proof", "Proof-to-Paid", "Proof, updates, payment flow"],
  ["reception", "Receptionist", "Enquiries into work drafts"],
  ["recurring", "Recurring", "Scheduled repeat work"],
  ["customer", "Customer Updates", "Approval-first messages"],
  ["quote_builder", "Quote Builder", "Build quotes with AI"],
  ["memory", "Client Memory", "History and property notes"],
  ["plans", "Plans / Billing", "Plan, limits, usage"],
  ["account", "Account Centre", "Owner account health"],
  ["settings", "Settings", "Business setup"],
  ["contact", "Contact Us", "Support request draft"],
  ["notifications", "Notifications", "Owner alert controls"],
  ["integrations", "Integrations", "MYOB, SMS, payments"],
  ["privacy", "Privacy", "Policy"],
  ["terms", "Terms", "Terms of use"],
  ["account_removal", "Account Removal", "Owner-only account request"],
];

function loadStaged() {
  try { return JSON.parse(localStorage.getItem(STAGED_KEY) || "[]"); } catch { return []; }
}
function saveStaged(items) { localStorage.setItem(STAGED_KEY, JSON.stringify(items.slice(0, 80))); }
function stageAction(action) {
  const item = { id: `staged-${Date.now()}-${Math.random().toString(36).slice(2)}`, priority: "medium", type: "staged", title: "Prepared action", summary: "Prepared safely in Control Room.", reason: "Owner review first.", ...action, staged: true, created_at: new Date().toISOString() };
  saveStaged([item, ...loadStaged()]);
  return item;
}
function removeStaged(id) { if (id) saveStaged(loadStaged().filter((x) => x.id !== id)); }
function collection(data, key) {
  return { jobs: data.jobs, clients: data.clients, quotes: data.quotes, invoices: data.invoices, team: data.workers, dispatch: data.jobs, proof: data.proof, reception: data.reception, recurring: data.recurring, customer: data.customer, quote_builder: data.quoteDrafts, memory: data.memory }[key] || [];
}
function findJob(data, jobId) { return data.jobs.find((j) => idOf(j) === String(jobId)) || null; }
function findClient(data, clientId) { return data.clients.find((c) => idOf(c) === String(clientId)) || null; }

async function tryPost(paths, payload) {
  let err;
  for (const path of paths) {
    try { return await post(path, payload); } catch (e) { err = e; }
  }
  throw err;
}

function invoiceFromJob(job, data) {
  const client = findClient(data, job?.client_id || job?.customer_id);
  const amount = Number(job?.price || job?.fixed_price || job?.amount || 0);
  const customer = job?.customer_name || job?.client_name || client?.name || client?.business_name || titleOf(job, "Customer");
  return {
    job_id: idOf(job),
    client_id: job?.client_id || job?.customer_id || idOf(client),
    customer_name: customer,
    customer_email: job?.customer_email || client?.email || "",
    address: job?.address || job?.job_address || client?.address || "",
    description: job?.ai_invoice_description || job?.invoice_description_draft || job?.description || job?.notes || `Service work completed for ${customer}.`,
    subtotal: amount,
    gst_rate: 15,
    notes: "Draft prepared from AI Control Room.",
  };
}

function makeActions(data) {
  const out = [];
  const invoicedJobs = new Set(data.invoices.map((i) => String(i.job_id || i.source_job_id || "")));
  const proofJobs = new Set(data.proof.map((p) => String(p.job_id || "")));
  data.jobs.forEach((j) => {
    const jid = idOf(j);
    const closed = ["completed", "complete", "cancelled", "canceled", "closed"].includes(norm(j.status));
    if (!closed && !j.worker_id && !j.assigned_worker_id) out.push({ id: `dispatch-${jid}`, type: "dispatch", priority: "high", title: `Assign worker for ${titleOf(j, "job")}`, summary: "Job has no worker assigned.", reason: "Unassigned work blocks the day.", next: "Pick worker and approve assignment.", job_id: jid });
    if (["completed", "complete"].includes(norm(j.status)) && !invoicedJobs.has(jid)) out.push({ id: `invoice-${jid}`, type: Number(j.price || j.fixed_price || 0) > 0 ? "revenue" : "pricing", priority: "high", title: Number(j.price || j.fixed_price || 0) > 0 ? `Create draft invoice for ${titleOf(j, "job")}` : `Add price for ${titleOf(j, "job")}`, summary: "Completed job is not invoiced yet.", reason: "Revenue is waiting.", next: "Prepare draft invoice.", job_id: jid });
    if (["completed", "complete"].includes(norm(j.status)) && !proofJobs.has(jid)) out.push({ id: `proof-${jid}`, type: "proof", priority: "medium", title: `Prepare proof pack for ${titleOf(j, "job")}`, summary: "Completed job has no proof pack.", reason: "Proof supports customer update and payment follow-up.", next: "Prepare proof pack.", job_id: jid });
  });
  data.invoices.filter((i) => ["open", "sent", "overdue", "unpaid", "pending_payment"].includes(norm(i.status))).forEach((i) => out.push({ id: `invoice-follow-${idOf(i)}`, type: "follow", priority: norm(i.status) === "overdue" ? "high" : "medium", title: `Prepare invoice reminder ${i.invoice_number || idOf(i).slice(-6)}`, summary: `${money(i.balance_due || i.balance || i.total || i.amount)} waiting.`, reason: "Money is waiting.", next: "Draft reminder.", invoice_id: idOf(i), client_id: i.client_id }));
  data.quotes.filter((q) => ["sent", "pending", "waiting", "viewed", "draft"].includes(norm(q.status))).forEach((q) => out.push({ id: `quote-follow-${idOf(q)}`, type: "follow", priority: "medium", title: `Prepare quote follow-up ${q.quote_number || idOf(q).slice(-6)}`, summary: "Quote needs a decision.", reason: "Follow-up can win work.", next: "Draft quote follow-up.", quote_id: idOf(q), client_id: q.client_id }));
  return out;
}

export default function AIControlRoomWiredPage() {
  const [data, setData] = useState({ jobs: [], clients: [], invoices: [], quotes: [], workers: [], proof: [], reception: [], recurring: [], customer: [], quoteDrafts: [], memory: [], health: {} });
  const [actions, setActions] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDraft, setJobDraft] = useState({});
  const [askText, setAskText] = useState("What should I do first?");
  const [askAnswer, setAskAnswer] = useState("");
  const [notice, setNotice] = useState("");
  const [fallbackMode, setFallbackMode] = useState(false);

  const load = useCallback(async () => {
    const paths = ["/ai/operator/today-plan", "/command-hub/actions", "/jobs", "/clients", "/invoices", "/quotes", "/team/workers", "/proof-packs", "/ai/receptionist/enquiries", "/ai/recurring", "/ai/customer-updates", "/ai/quotes/drafts", "/ai/client-memory", "/ai/operator/business-health"];
    const res = await Promise.all(paths.map((p) => get(p).catch(() => null)));
    const next = { jobs: arr(res[2]), clients: arr(res[3]), invoices: arr(res[4]), quotes: arr(res[5]), workers: arr(res[6]), proof: arr(res[7]), reception: arr(res[8]), recurring: arr(res[9]), customer: arr(res[10]), quoteDrafts: arr(res[11]), memory: arr(res[12]), health: res[13]?.data || res[13] || {} };
    const backendActions = arr(res[1]);
    const localActions = makeActions(next);
    const staged = loadStaged();
    setFallbackMode(!backendActions.length);
    setActions([...staged, ...(backendActions.length ? backendActions : localActions)]);
    setData(next);
  }, []);

  useEffect(() => { load(); }, [load]);

  const moneyWaiting = useMemo(() => data.invoices.filter((i) => ["open", "sent", "overdue", "unpaid", "pending_payment"].includes(norm(i.status))).reduce((sum, i) => sum + Number(i.balance_due || i.balance || i.total || i.amount || 0), 0), [data.invoices]);
  const counts = useMemo(() => ({ dispatch: actions.filter((a) => norm(a.type).includes("dispatch")).length, revenue: actions.filter((a) => ["revenue", "invoice", "pricing"].some((x) => norm(a.type).includes(x))).length, follow: actions.filter((a) => norm(a.type).includes("follow")).length, proof: actions.filter((a) => norm(a.type).includes("proof")).length, reception: actions.filter((a) => norm(a.type).includes("reception")).length, recurring: actions.filter((a) => norm(a.type).includes("recurring")).length, customer: actions.filter((a) => norm(a.type).includes("customer")).length, quote_builder: actions.filter((a) => norm(a.type).includes("quote")).length, memory: actions.filter((a) => norm(a.type).includes("memory")).length }), [actions]);
  const activeJobs = useMemo(() => data.jobs.filter((j) => !["completed", "complete", "closed", "cancelled", "canceled"].includes(norm(j.status))).slice(0, 8), [data.jobs]);
  const best = actions[0]?.title || "Review today’s work plan";

  const openJob = (jobOrId) => {
    const job = typeof jobOrId === "string" ? findJob(data, jobOrId) : (findJob(data, idOf(jobOrId)) || jobOrId);
    if (!job) return;
    setSelectedJob(job);
    setJobDraft({ title: job.title || job.name || "", status: job.status || "assigned", worker_id: job.worker_id || job.assigned_worker_id || "", price: job.price || job.fixed_price || job.amount || 0, notes: job.notes || "" });
    setDrawer({ kind: "job", title: titleOf(job, "Job"), desc: "Edit job, assign worker, invoice, proof." });
  };

  const runScan = async () => {
    try { await tryPost(["/smart-hub/scan", "/ai/operator/run-daily-check", "/ai/operator/prepare-today"], {}); setNotice("AI scan completed."); }
    catch { setNotice("AI scan backend is not live yet. Local queue refreshed."); }
    await load();
  };

  const saveJob = async () => {
    if (!selectedJob) return;
    const jobId = idOf(selectedJob);
    await patch(`/jobs/${jobId}`, { title: jobDraft.title, status: jobDraft.status, price: Number(jobDraft.price || 0), fixed_price: Number(jobDraft.price || 0), notes: jobDraft.notes || "" });
    if (jobDraft.worker_id && jobDraft.worker_id !== (selectedJob.worker_id || selectedJob.assigned_worker_id)) {
      try { await tryPost([`/jobs/${jobId}/assign`, `/jobs/${jobId}/assign-worker`], { worker_id: jobDraft.worker_id }); }
      catch { stageAction({ type: "dispatch", title: `Assign worker for ${jobDraft.title || titleOf(selectedJob, "job")}`, summary: "Assignment staged because assign route did not accept it yet.", job_id: jobId, worker_id: jobDraft.worker_id }); }
    }
    setNotice("Job saved. Assignment applied or staged.");
    await load();
  };

  const approve = async (action) => {
    const type = norm(action.type || action.action_type);
    const jobId = String(action.job_id || action.payload?.job_id || "");
    const workerId = String(action.worker_id || action.payload?.worker_id || "");
    try {
      if (type.includes("dispatch")) {
        if (!jobId || !workerId) { stageAction({ ...action, type: "dispatch", title: action.title || "Pick worker for assignment", summary: "Open job drawer and choose a worker first." }); setNotice("Assignment staged. Pick a worker first."); await load(); return; }
        await tryPost([`/jobs/${jobId}/assign`, `/jobs/${jobId}/assign-worker`], { worker_id: workerId });
        removeStaged(action.id); setNotice("Worker assigned."); await load(); return;
      }
      if (type.includes("revenue") || type.includes("invoice")) {
        const job = findJob(data, jobId) || selectedJob || action.payload;
        const payload = invoiceFromJob(job || {}, data);
        if (!Number(payload.subtotal || 0)) { stageAction({ ...action, type: "pricing", title: action.title || "Add price before invoice", summary: "Add price in job drawer before invoice." }); setNotice("Price needed. Action staged."); await load(); return; }
        await post("/invoices", payload);
        removeStaged(action.id); setNotice("Draft invoice created."); await load(); return;
      }
      if (type.includes("proof")) {
        try { await post("/proof-packs", { job_id: jobId, title: action.title || "Proof pack", status: "draft", notes: "Prepared from AI Control Room" }); removeStaged(action.id); setNotice("Proof pack prepared."); }
        catch { stageAction({ ...action, type: "proof", summary: "Proof pack staged for review." }); setNotice("Proof staged for review."); }
        await load(); return;
      }
      try { await post("/command-hub/actions/execute", action); removeStaged(action.id); setNotice("Action completed."); }
      catch { stageAction({ ...action, summary: action.summary || "Prepared in Control Room staging." }); setNotice("Action staged safely."); }
      await load();
    } catch (e) {
      setNotice(e?.message || "Action failed safely.");
    }
  };

  const askAi = async (prompt) => {
    const q = prompt || askText;
    try { const r = await tryPost(["/ai/operator/ask", "/ai/ask", "/smart-hub/ask"], { question: q, prompt: q }); setAskAnswer(r?.data?.answer || r?.data?.response || r?.answer || r?.response || "AI answered."); }
    catch { const a = actions[0]; setAskAnswer(a ? `Start with: ${a.title}. Why: ${a.reason || a.summary}. Next: ${a.next || "Open the drawer and approve."}` : "No urgent blocker found. Review active jobs then approvals."); }
  };

  return <Layout><main className="cr-room-page">
    <section className="cr-room-hero"><div><ChurvoxLogo size="hero" /><p className="cr-room-kicker">AI Operator</p><h1>AI Control Room</h1><p>AI prepares the admin, dispatch, proof, invoices, follow-ups and customer work. Owner edits and approves inside drawers. Churvox executes safely.</p><div className="cr-room-row"><button onClick={runScan}>Run AI scan</button><button onClick={() => setDrawer({ kind: "ask", title: "Ask AI", desc: "Ask the operator" })}>Ask AI</button><button onClick={() => setDrawer({ kind: "approvals", title: "Approvals", desc: "Review prepared work", filter: "all" })}>Open approvals</button></div></div><aside className="cr-room-score"><h3>Live score</h3><p>Approvals: {actions.length}</p><p>Workers active: {data.workers.length}</p><p>Money waiting: {money(moneyWaiting)}</p><p>Status: {fallbackMode ? "local AI fallback mode" : "live AI queue"}</p></aside></section>
    <section className="cr-room-safety">No auto-send · No auto-charge · No MYOB write · No payroll changes · No deletion without owner approval.</section>
    <section className="cr-room-zone cr-room-plan"><p className="cr-room-zone-label">Zone 1 · AI Today Plan</p><h2>{best}</h2><p>{actions[0]?.reason || "AI is using live business data and safe local rules."}</p><div className="cr-room-grid4"><Metric label="Need crew" value={counts.dispatch} /><Metric label="Revenue" value={`$${moneyWaiting.toFixed(0)}`} /><Metric label="Follow-ups" value={counts.follow} /><Metric label="Proof" value={counts.proof} /></div><div className="cr-room-row"><button onClick={() => setDrawer({ kind: "approvals", title: "Work plan", desc: "Prepared actions", filter: "all" })}>Work plan</button><button onClick={() => { setDrawer({ kind: "ask", title: "Explain plan", desc: "AI reasoning" }); askAi("Explain today’s plan"); }}>Explain plan</button></div></section>
    <section className="cr-room-zone"><p className="cr-room-zone-label">Zone 2 · Next Best Moves</p><h2>Choose the next business move</h2><div className="cr-room-grid3"><MoveCard title="Dispatch the day" value={counts.dispatch} text="Assign workers and unblock today’s jobs" onClick={() => setDrawer({ kind: "workspace", key: "dispatch", title: "Dispatch", desc: "Assign workers" })} /><MoveCard title="Move money" value={counts.revenue + counts.follow} text="Draft invoices and follow-ups" onClick={() => setDrawer({ kind: "workspace", key: "invoices", title: "Invoices", desc: "Move money" })} /><MoveCard title="Proof & updates" value={counts.proof + counts.customer} text="Prepare proof packs and customer updates" onClick={() => setDrawer({ kind: "workspace", key: "proof", title: "Proof-to-Paid", desc: "Proof and updates" })} /></div></section>
    <section className="cr-room-zone"><p className="cr-room-zone-label">Zone 3 · Active Work Board</p><h2>Jobs moving now</h2><div className="cr-room-list">{activeJobs.map((j) => <div className="cr-room-list-row" key={idOf(j)}><div><strong>{titleOf(j, "Job")}</strong><p>{j.client_name || "Client"} · {j.status || "assigned"} · {j.worker_name || j.assigned_worker_name || "Unassigned"}</p></div><button onClick={() => openJob(j)}>Work here</button></div>)}</div></section>
    <section className="cr-room-zone"><p className="cr-room-zone-label">Zone 4 · AI Approval Control</p><h2>Approve what AI prepared</h2><div className="cr-room-grid5">{approvals.map(([key, label, desc]) => <button className="cr-room-approval" key={key} onClick={() => setDrawer({ kind: "approvals", title: label, desc, filter: key })}><strong>{label}</strong><span>{desc}</span><em>{key === "all" ? actions.length : countFor(counts, key)} ready</em></button>)}</div></section>
    <section className="cr-room-zone"><p className="cr-room-zone-label">Zone 5 · Owner Workspaces</p><h2>Run every area from one hub</h2><div className="cr-room-grid5">{workspaces.map(([key, label, desc]) => <button className="cr-room-workspace" key={key} onClick={() => setDrawer({ kind: "workspace", key, title: label, desc })}><strong>{label}</strong><span>{desc}</span><em>{workspaceCount(data, key)}</em></button>)}</div></section>
    {notice ? <div className="cr-room-notice">{notice}</div> : null}
    {drawer ? <Drawer drawer={drawer} close={() => setDrawer(null)} data={data} actions={actions} counts={counts} askText={askText} setAskText={setAskText} askAnswer={askAnswer} askAi={askAi} jobDraft={jobDraft} setJobDraft={setJobDraft} selectedJob={selectedJob} openJob={openJob} saveJob={saveJob} approve={approve} /> : null}
  </main></Layout>;
}

function countFor(counts, key) { if (key === "follow_ups") return counts.follow; return counts[key] || 0; }
function workspaceCount(data, key) { const items = collection(data, key); if (items.length) return `${items.length} loaded`; return ["plans", "account", "settings", "contact", "notifications", "integrations", "privacy", "terms", "account_removal"].includes(key) ? "ready" : "0 loaded"; }
function Metric({ label, value }) { return <div className="cr-room-metric"><span>{label}</span><strong>{value}</strong></div>; }
function MoveCard({ title, value, text, onClick }) { return <button className="cr-room-card" onClick={onClick}><small>Next move</small><h3>{title}</h3><b>{value}</b><p>{text}</p></button>; }

function Drawer({ drawer, close, data, actions, counts, askText, setAskText, askAnswer, askAi, jobDraft, setJobDraft, selectedJob, openJob, saveJob, approve }) {
  const filtered = drawer.kind === "approvals" && drawer.filter && drawer.filter !== "all" ? actions.filter((a) => norm(a.type).includes(drawer.filter) || (drawer.filter === "revenue" && ["invoice", "pricing"].some((x) => norm(a.type).includes(x))) || (drawer.filter === "follow_ups" && norm(a.type).includes("follow"))) : actions;
  return <div className="cr-room-drawer-backdrop" onClick={close}><aside className="cr-room-drawer" onClick={(e) => e.stopPropagation()}><header><div><h3>{drawer.title}</h3><p>{drawer.desc}</p></div><button onClick={close}>Close</button></header><div className="cr-room-drawer-body">{drawer.kind === "ask" ? <AskDrawer askText={askText} setAskText={setAskText} askAnswer={askAnswer} askAi={askAi} /> : drawer.kind === "job" ? <JobDrawer data={data} selectedJob={selectedJob} jobDraft={jobDraft} setJobDraft={setJobDraft} saveJob={saveJob} approve={approve} /> : drawer.kind === "approvals" ? <ApprovalDrawer actions={filtered} approve={approve} openJob={openJob} /> : <WorkspaceDrawer drawer={drawer} data={data} counts={counts} askAi={askAi} approve={approve} openJob={openJob} />}</div></aside></div>;
}

function AskDrawer({ askText, setAskText, askAnswer, askAi }) { return <div className="cr-room-form"><label>Ask AI<textarea value={askText} onChange={(e) => setAskText(e.target.value)} /></label><div className="cr-room-row">{["What should I do first?", "Who should I assign first?", "What money is waiting?", "What proof packs are missing?"].map((p) => <button key={p} onClick={() => setAskText(p)}>{p}</button>)}</div><button onClick={() => askAi()}>Ask AI</button>{askAnswer ? <div className="cr-room-drawer-card"><p>{askAnswer}</p></div> : null}</div>; }
function JobDrawer({ data, selectedJob, jobDraft, setJobDraft, saveJob, approve }) { const jobId = idOf(selectedJob); return <div className="cr-room-form"><div className="cr-room-drawer-card"><h4>{titleOf(selectedJob, "Job")}</h4><p>Edit the job, assign worker, create draft invoice, or prepare proof.</p></div>{["title", "status", "price", "notes"].map((k) => <label key={k}>{k}<input value={jobDraft[k] || ""} onChange={(e) => setJobDraft((s) => ({ ...s, [k]: e.target.value }))} /></label>)}<label>worker<select value={jobDraft.worker_id || ""} onChange={(e) => setJobDraft((s) => ({ ...s, worker_id: e.target.value }))}><option value="">Unassigned</option>{data.workers.map((w) => <option key={idOf(w)} value={idOf(w)}>{w.name || w.email}</option>)}</select></label><div className="cr-room-row"><button onClick={saveJob}>Save job</button><button onClick={() => approve({ type: "dispatch", job_id: jobId, worker_id: jobDraft.worker_id, title: `Assign worker for ${titleOf(selectedJob, "job")}` })}>Approve assignment</button><button onClick={() => approve({ type: "revenue", job_id: jobId, title: `Create invoice for ${titleOf(selectedJob, "job")}` })}>Create draft invoice</button><button onClick={() => approve({ type: "proof", job_id: jobId, title: `Prepare proof for ${titleOf(selectedJob, "job")}` })}>Prepare proof pack</button></div></div>; }
function ApprovalDrawer({ actions, approve, openJob }) { return <div className="cr-room-card-list">{actions.length ? actions.map((a) => <article key={a.id} className="cr-room-action"><span className="cr-room-pill">{a.staged ? "staged" : a.priority || "review"}</span><h3>{a.title}</h3><p>{a.summary}</p><p><strong>Why:</strong> {a.reason}</p><div className="cr-room-row">{a.job_id ? <button onClick={() => openJob(a.job_id)}>Edit job first</button> : null}<button onClick={() => approve(a)}>Approve action</button></div></article>) : <div className="cr-room-drawer-card"><p>No actions in this group yet.</p></div>}</div>; }
function WorkspaceDrawer({ drawer, data, counts, askAi, approve, openJob }) { const [draft, setDraft] = useState({ title: "", amount: "", notes: "" }); const items = collection(data, drawer.key).slice(0, 8); return <div className="cr-room-form"><div className="cr-room-drawer-card"><h4>{drawer.title}</h4><p>{drawer.desc}</p><div className="cr-room-mini-stats"><span>{items.length} records</span><span>{counts.dispatch} dispatch</span><span>{counts.follow} follow-ups</span></div></div>{items.length ? <div className="cr-room-list">{items.map((x, i) => <div key={idOf(x) || i} className="cr-room-list-row"><div><strong>{titleOf(x, `Item ${i + 1}`)}</strong><p>{x.status || x.email || x.phone || "ready"}</p></div>{["jobs", "dispatch"].includes(drawer.key) ? <button onClick={() => openJob(x)}>Work here</button> : <button onClick={() => approve({ type: drawer.key, title: `Stage ${drawer.title}`, payload: x })}>Stage</button>}</div>)}</div> : null}<label>title / customer<input value={draft.title} onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))} /></label><label>amount / status<input value={draft.amount} onChange={(e) => setDraft((s) => ({ ...s, amount: e.target.value }))} /></label><label>notes<textarea value={draft.notes} onChange={(e) => setDraft((s) => ({ ...s, notes: e.target.value }))} /></label><div className="cr-room-row"><button onClick={() => askAi(`Prepare ${drawer.title}: ${draft.title} ${draft.notes}`)}>Ask AI to prepare</button><button onClick={() => approve({ type: drawer.key, title: `${drawer.title} staged`, summary: draft.title || draft.notes || "Prepared from drawer", payload: draft })}>Stage for approval</button></div></div>; }
