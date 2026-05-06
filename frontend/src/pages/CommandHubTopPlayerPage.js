import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { useAuth } from "../context/AuthContext";
import { get, patch, post } from "../lib/api";
import { idOf, listFrom, money, norm, unwrap } from "../lib/commandHubUtils";
import "../styles/smartCommandSystem.css";
import "../styles/commandHubReal.css";
import "../styles/commandHubModernFix.css";

const OWNER_ROLES = ["owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"];
const canUse = (role) => OWNER_ROLES.includes(norm(role));
const today = () => new Date().toISOString().slice(0, 10);
const safeGet = async (path) => { try { return await get(path); } catch { return null; } };
const recordName = (x, fallback = "Record") => x?.title || x?.name || x?.business_name || x?.company_name || x?.invoice_number || x?.quote_number || x?.email || x?.customer_name || fallback;
const clientName = (job, clients = []) => {
  const cid = String(job?.client_id || job?.customer_id || "");
  const c = clients.find((x) => [x.id, x._id, x.client_id].map(String).includes(cid));
  return c?.name || c?.business_name || job?.client_name || job?.customer_name || "Client";
};
const isClosed = (job) => ["completed", "complete", "cancelled", "canceled"].includes(norm(job?.status));

function actionize(a = {}) {
  const p = a.payload || {};
  const type = a.type || "review";
  return {
    ...a,
    id: a.id || `${type}-${a.job_id || a.invoice_id || a.quote_id || p.job_id || p.invoice_id || p.quote_id || Math.random().toString(36).slice(2)}`,
    type,
    priority: a.priority || "medium",
    title: a.title || "Review prepared action",
    summary: a.summary || a.message || "AI prepared this for owner review.",
    reason: a.reason || "Found from your business data.",
    next: a.next || "Owner approval required before anything happens.",
    job_id: a.job_id || p.job_id,
    invoice_id: a.invoice_id || p.invoice_id,
    quote_id: a.quote_id || p.quote_id,
    client_id: a.client_id || p.client_id,
  };
}

function buildActions(data) {
  const actions = (data.actions || []).map(actionize);
  const proofJobIds = new Set((data.proof || []).map((p) => String(p.job_id || "")).filter(Boolean));
  const invoiceJobIds = new Set((data.invoices || []).map((i) => String(i.job_id || i.source_job_id || "")).filter(Boolean));

  (data.jobs || []).forEach((job) => {
    const jid = idOf(job);
    if (!jid) return;
    const assigned = job.assigned_worker_id || job.worker_id || job.assigned_worker;
    const title = recordName(job, clientName(job, data.clients));
    if (!assigned && !isClosed(job)) {
      actions.push(actionize({ type: "dispatch", priority: "high", job_id: jid, title: `Assign crew to ${title}`, summary: `${clientName(job, data.clients)} needs a worker assigned.`, reason: "Unassigned jobs block the day.", next: "Choose/approve worker inside the drawer." }));
    }
    if (["completed", "complete"].includes(norm(job.status)) && !invoiceJobIds.has(jid) && !job.invoice_id) {
      const price = Number(job.fixed_price ?? job.price ?? job.amount ?? 0);
      actions.push(actionize({ type: price > 0 ? "invoice" : "pricing", priority: price > 0 ? "medium" : "high", job_id: jid, title: price > 0 ? `Create draft invoice for ${title}` : `Add pricing for ${title}`, summary: price > 0 ? `Suggested draft amount ${money(price)}.` : "Completed job needs pricing before invoicing.", reason: "Completed work should move to draft invoice safely.", next: price > 0 ? "Create draft only. No send, charge, or MYOB write." : "Add pricing in the drawer first." }));
    }
    if (["completed", "complete"].includes(norm(job.status)) && !proofJobIds.has(jid) && !job.proof_pack_id) {
      actions.push(actionize({ type: "proof", priority: "medium", job_id: jid, title: `Prepare proof pack for ${title}`, summary: "Completed work needs proof before payment follow-up.", reason: "Proof-to-Paid needs customer-ready evidence.", next: "Prepare proof pack only for owner review." }));
    }
  });

  (data.invoices || []).forEach((inv) => {
    const iid = idOf(inv);
    if (iid && ["sent", "open", "overdue", "unpaid", "pending_payment"].includes(norm(inv.status))) {
      actions.push(actionize({ type: "follow", priority: norm(inv.status) === "overdue" ? "high" : "medium", invoice_id: iid, title: `Prepare invoice reminder ${inv.invoice_number || iid.slice(-6)}`, summary: `${money(inv.balance_due ?? inv.balance ?? inv.total ?? inv.amount)} waiting.`, reason: "Money is waiting to come in.", next: "Draft reminder only. Owner sends later." }));
    }
  });

  (data.quotes || []).forEach((quote) => {
    const qid = idOf(quote);
    if (qid && ["sent", "pending", "waiting", "viewed", "draft"].includes(norm(quote.status))) {
      actions.push(actionize({ type: "follow", priority: "medium", quote_id: qid, title: `Prepare quote follow-up ${quote.quote_number || qid.slice(-6)}`, summary: "Quote is waiting for a customer decision.", reason: "Follow-up helps win work.", next: "Draft follow-up only. Owner sends later." }));
    }
  });

  const seen = new Set();
  return actions.filter((a) => { const key = `${a.type}-${a.job_id || a.invoice_id || a.quote_id || a.client_id || a.title}`; if (seen.has(key)) return false; seen.add(key); return true; });
}

function Button({ children, tone = "orange", ...props }) {
  return <button className={`command-btn ${tone}`} {...props}>{children}</button>;
}

function Drawer({ drawer, close, children }) {
  if (!drawer) return null;
  return <div className="command-drawer-backdrop" onClick={close}><aside className="command-drawer command-work-drawer" onClick={(e) => e.stopPropagation()}><div className="command-drawer-head"><div><p className="smart-command-kicker">Work inside Command</p><h2>{drawer.title}</h2><p>{drawer.subtitle}</p></div><button onClick={close}>Close</button></div>{children}</aside></div>;
}

function JobEditor({ job, workers, clients, saveJob, execute }) {
  const [draft, setDraft] = useState({ title: job?.title || job?.name || "", status: job?.status || "assigned", worker: job?.assigned_worker_id || job?.worker_id || "", price: job?.fixed_price || job?.price || job?.amount || "", notes: job?.notes || "" });
  const jid = idOf(job);
  return <div className="command-drawer-stack"><div className="command-editor-card"><p className="smart-command-kicker">Job workspace</p><h3>{recordName(job, "Job")}</h3><p>{clientName(job, clients)} · {job?.address || job?.job_address || "No address saved"}</p></div><label>Job title<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label><label>Status<select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="assigned">Assigned</option><option value="acknowledged">Acknowledged</option><option value="in_progress">In progress</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><label>Worker<select value={draft.worker} onChange={(e) => setDraft({ ...draft, worker: e.target.value })}><option value="">AI choose / no worker</option>{workers.map((w) => <option key={idOf(w)} value={idOf(w)}>{w.name || w.email || "Worker"}</option>)}</select></label><label>Price<input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></label><label>Notes<textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></label><div className="command-card-actions"><Button onClick={() => saveJob(jid, draft)}>Save job</Button><Button tone="dark" onClick={() => execute({ type: "dispatch", job_id: jid, worker_id: draft.worker })}>Approve assignment</Button><Button tone="light" onClick={() => execute({ type: "invoice", job_id: jid })}>Create draft invoice</Button><Button tone="light" onClick={() => execute({ type: "proof", job_id: jid })}>Prepare proof pack</Button></div></div>;
}

function WorkspaceEditor({ title, data, actions, openJob, execute, askAi, saveSettings }) {
  const lower = norm(title);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", amount: "", notes: "", status: "draft", business_name: "", industry: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const recordList = (items, empty, pick) => <div className="command-record-list">{items?.length ? items.slice(0, 10).map((x, i) => <button key={idOf(x) || i} className="command-record-row" onClick={() => pick?.(x)}><strong>{recordName(x, `${title} ${i + 1}`)}</strong><span>{x.status || x.email || x.role || x.summary || "Ready"}</span></button>) : <p>{empty}</p>}</div>;

  if (lower.includes("job")) return <div className="command-drawer-stack"><div className="command-editor-card"><h3>Jobs workspace</h3><p>Create, edit, assign, price, invoice and proof jobs inside this drawer.</p></div>{recordList(data.jobs, "No jobs loaded.", (j) => openJob(idOf(j)))}<label>New job title<input value={form.name} onChange={(e) => set("name", e.target.value)} /></label><label>Job notes<textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></label><Button onClick={() => askAi(`Prepare a job draft for ${form.name || "new work"}`)}>Ask AI to prepare job</Button></div>;
  if (lower.includes("client")) return <div className="command-drawer-stack"><div className="command-editor-card"><h3>Clients workspace</h3><p>Edit client details, stage jobs, quotes and client memory.</p></div>{recordList(data.clients, "No clients loaded.")}<label>Client name<input value={form.name} onChange={(e) => set("name", e.target.value)} /></label><label>Email<input value={form.email} onChange={(e) => set("email", e.target.value)} /></label><label>Phone<input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label><Button onClick={() => askAi(`Prepare next action for client ${form.name}`)}>Prepare client action</Button></div>;
  if (lower.includes("quote")) return <div className="command-drawer-stack"><div className="command-editor-card"><h3>Quotes workspace</h3><p>Draft quotes and follow-ups. Nothing sends without approval.</p></div>{recordList(data.quotes, "No quotes loaded.")}<label>Quote notes<textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></label><Button onClick={() => askAi("Prepare a quote draft or follow-up")}>Prepare quote draft</Button></div>;
  if (lower.includes("invoice") || lower.includes("billing") || lower.includes("plan")) return <div className="command-drawer-stack"><div className="command-editor-card"><h3>{lower.includes("plan") ? "Plans / Billing" : "Invoices workspace"}</h3><p>Review plan, billing, invoices, reminders and draft money actions.</p></div>{recordList(data.invoices, "No invoices loaded.")}<label>Reminder draft<textarea value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="AI reminder draft" /></label><Button onClick={() => askAi("What invoice or billing action should I do next?")}>Ask AI money plan</Button></div>;
  if (lower.includes("team") || lower.includes("dispatch")) return <div className="command-drawer-stack"><div className="command-editor-card"><h3>{lower.includes("dispatch") ? "Dispatch workspace" : "Team workspace"}</h3><p>Assign jobs, review workers and approve AI dispatch suggestions.</p></div>{recordList(data.workers, "No workers loaded.")}<div className="command-action-list">{actions.filter((a) => a.type === "dispatch").slice(0, 6).map((a) => <button key={a.id} className="command-action-card" onClick={() => execute(a)}><strong>{a.title}</strong><span>{a.reason}</span></button>)}</div><Button onClick={() => askAi("Who should I assign first and why?")}>Ask AI who to assign</Button></div>;
  if (lower.includes("proof")) return <div className="command-drawer-stack"><div className="command-editor-card"><h3>Proof-to-Paid workspace</h3><p>Prepare proof packs before chasing payment.</p></div>{recordList(data.proof, "No proof packs loaded.")}<Button onClick={() => askAi("What proof packs are missing?")}>Find missing proof</Button></div>;
  if (lower.includes("reception")) return <DraftBox title="AI Receptionist" text="Capture enquiry, prepare client/job/quote drafts. Owner approves first." form={form} set={set} askAi={askAi} prompt="Prepare this enquiry into client/job/quote drafts" />;
  if (lower.includes("recurring")) return <DraftBox title="Recurring workspace" text="Prepare next recurring jobs and schedules." form={form} set={set} askAi={askAi} prompt="Prepare recurring jobs due next" />;
  if (lower.includes("customer")) return <DraftBox title="Customer updates" text="Draft customer messages from job status, notes and proof." form={form} set={set} askAi={askAi} prompt="Draft customer updates needing approval" />;
  if (lower.includes("memory")) return <DraftBox title="Client memory" text="Save property/service memory and prepare next best actions." form={form} set={set} askAi={askAi} prompt="Summarise client memory and next actions" />;
  if (lower.includes("setting")) return <div className="command-drawer-stack"><div className="command-editor-card"><h3>Settings workspace</h3><p>Stage business setup changes inside Command.</p></div><label>Business name<input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} /></label><label>Industry<input value={form.industry} onChange={(e) => set("industry", e.target.value)} /></label><label>Phone<input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label><Button onClick={() => saveSettings(form)}>Save settings</Button></div>;
  if (lower.includes("contact")) return <DraftBox title="Contact support" text="Write support request without leaving Command." form={form} set={set} askAi={askAi} prompt="Help me write this support request" />;
  if (lower.includes("notification")) return <div className="command-drawer-stack"><div className="command-editor-card"><h3>Notifications workspace</h3><p>Choose owner alerts for work, payments and approvals.</p></div>{["Job completed", "Worker assigned", "Invoice overdue", "Quote follow-up", "Proof pack ready", "Recurring due"].map((x) => <label key={x}><input type="checkbox" defaultChecked /> {x}</label>)}<Button>Save alert draft</Button></div>;
  if (lower.includes("integration")) return <div className="command-drawer-stack"><div className="command-editor-card"><h3>Integrations workspace</h3><p>Review MYOB, SMS and payment tools. AI checked and will not write to external systems without approval.</p></div><Button onClick={() => askAi("Check integration readiness for MYOB SMS and payments")}>Check integration readiness</Button></div>;
  if (lower.includes("privacy") || lower.includes("terms") || lower.includes("removal")) return <div className="command-drawer-stack"><div className="command-editor-card"><h3>{title}</h3><p>Read and stage account/legal actions safely. AI checked and will never delete or change legal/account status automatically.</p></div><textarea placeholder="Owner notes" /><Button>Save note</Button></div>;
  return <DraftBox title={title} text="Work in this drawer first. Full page is only a fallback." form={form} set={set} askAi={askAi} prompt={`Prepare ${title} action`} />;
}

function DraftBox({ title, text, form, set, askAi, prompt }) {
  return <div className="command-drawer-stack"><div className="command-editor-card"><h3>{title}</h3><p>{text}</p></div><label>Details<textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Write notes, message, or instructions here" /></label><label>Draft message<textarea value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="AI/owner draft" /></label><div className="command-card-actions"><Button onClick={() => askAi(prompt)}>Ask AI to prepare</Button><Button tone="light">Save draft</Button><Button tone="dark">Mark ready for approval</Button></div></div>;
}

export default function CommandHubTopPlayerPage() {
  const { user } = useAuth();
  const [data, setData] = useState({ jobs: [], clients: [], invoices: [], quotes: [], workers: [], proof: [], actions: [], enquiries: [], recurring: [], updates: [], drafts: [], memory: [], plan: {}, health: {} });
  const [drawer, setDrawer] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [offline, setOffline] = useState(false);

  const load = async () => {
    const rs = await Promise.all([safeGet("/ai/operator/today-plan"), safeGet("/command-hub/actions"), safeGet("/jobs"), safeGet("/clients"), safeGet("/invoices"), safeGet("/quotes"), safeGet("/team/workers"), safeGet("/proof-packs"), safeGet("/ai/receptionist/enquiries"), safeGet("/ai/recurring"), safeGet("/ai/customer-updates"), safeGet("/ai/quotes/drafts"), safeGet("/ai/client-memory"), safeGet("/ai/operator/business-health")]);
    setOffline(rs.some((x) => x === null));
    setData({ plan: unwrap(rs[0]) || {}, actions: listFrom(rs[1], ["actions", "items"]), jobs: listFrom(rs[2], ["jobs"]), clients: listFrom(rs[3], ["clients"]), invoices: listFrom(rs[4], ["invoices"]), quotes: listFrom(rs[5], ["quotes"]), workers: listFrom(rs[6], ["workers", "items"]), proof: listFrom(rs[7], ["proof_packs", "items"]), enquiries: listFrom(rs[8], ["enquiries", "items"]), recurring: listFrom(rs[9], ["rules", "items"]), updates: listFrom(rs[10], ["updates", "items"]), drafts: listFrom(rs[11], ["drafts", "items"]), memory: listFrom(rs[12], ["items"]), health: unwrap(rs[13]) || {} });
  };

  useEffect(() => { load(); }, []);
  const actions = useMemo(() => buildActions(data), [data]);
  const groups = useMemo(() => ({ dispatch: actions.filter((a) => a.type === "dispatch"), revenue: actions.filter((a) => ["invoice", "pricing"].includes(a.type)), proof: actions.filter((a) => a.type === "proof"), follow: actions.filter((a) => a.type === "follow") }), [actions]);
  const activeWork = useMemo(() => { const scheduled = data.jobs.filter((j) => String(j.scheduled_date || j.date || j.start_date || "").startsWith(today())); return (scheduled.length ? scheduled : data.jobs.filter((j) => !isClosed(j))).slice(0, 8); }, [data.jobs]);
  const waiting = useMemo(() => data.invoices.reduce((s, i) => s + (["sent", "open", "overdue", "unpaid"].includes(norm(i.status)) ? Number(i.balance_due ?? i.balance ?? i.total ?? i.amount ?? 0) : 0), 0), [data.invoices]);
  const best = actions[0];

  const runScan = async () => { try { await post("/smart-hub/scan", {}); setNotice("AI scan complete. Queue refreshed."); await load(); } catch { setError("AI scan could not run yet. Nothing unsafe happened."); } };
  const askAi = async (question) => { try { const res = await post("/ai/operator/ask", { question }); const p = unwrap(res); setAiAnswer(p?.answer || "AI prepared a response from loaded business data."); } catch { setAiAnswer(best ? `Start with: ${best.title}. ${best.reason}` : "No urgent blocker found in loaded data."); } setDrawer({ kind: "ask", title: "Ask AI Operator", subtitle: question }); };
  const execute = async (payload) => { try { await post("/command-hub/actions/execute", { action_type: payload.type, ...payload }); setNotice("Owner-approved action executed or staged safely."); await load(); } catch { setError("Action could not run yet. Nothing unsafe happened."); } };
  const saveJob = async (id, draft) => { try { await patch(`/jobs/${id}`, { title: draft.title, status: draft.status, assigned_worker_id: draft.worker || undefined, worker_id: draft.worker || undefined, fixed_price: Number(draft.price || 0), price: Number(draft.price || 0), notes: draft.notes }); setNotice("Job saved inside Command."); await load(); } catch { setError("Job save failed. Check backend job PATCH route."); } };
  const saveSettings = async (draft) => { try { await patch("/settings", draft); setNotice("Settings saved/staged inside Command."); } catch { setNotice("Settings drawer is ready; save endpoint still needs confirming."); } };

  if (!canUse(user?.role)) return <Layout><main className="smart-command-system"><section className="command-panel"><h2>AI Control Room is owner/admin only.</h2><p>Workers and payroll users stay in focused workspaces.</p></section></main></Layout>;

  const workspaceTiles = ["Jobs", "Clients", "Quotes", "Invoices", "Team", "Dispatch", "Proof-to-Paid", "AI Receptionist", "Recurring", "Customer updates", "Quote builder", "Client Memory", "Plans / Billing", "Settings", "Contact", "Notifications", "Integrations", "Privacy", "Terms", "Account Removal"];
  const openJob = (id) => { const job = data.jobs.find((j) => idOf(j) === String(id)); if (job) setDrawer({ kind: "job", title: recordName(job, "Job"), subtitle: clientName(job, data.clients), item: job }); };

  return <Layout smartHubMode><main className="smart-command-system"><div className="command-real-shell">
    <section className="command-hero"><div className="command-hero-brand"><ChurvoxLogo size="hero" /></div><div className="command-hero-copy"><p className="smart-command-kicker">AI Operator</p><h1>AI Control Room</h1><p>AI prepares dispatch, invoices, proof, follow-ups, recurring work, customers, settings and account actions. Owner works and approves inside drawers.</p><div className="command-hero-actions"><Button onClick={runScan}>Run AI scan</Button><Button tone="light" onClick={() => askAi("What should I do first today?")}>Ask AI</Button><Button tone="dark" onClick={() => setDrawer({ kind: "approvals", title: "AI Approval Control", subtitle: "Approve what AI prepared" })}>Open approvals</Button></div></div><aside className="command-hero-score"><span>{offline ? "Local fallback" : "Live command"}</span><strong>{actions.length} approvals</strong><strong>{data.workers.length} workers</strong><strong>{money(waiting)} waiting</strong></aside></section>
    <section className="command-safe-strip">No auto-send · No auto-charge · No MYOB write · No payroll changes · No deletion without owner approval.</section>
    {notice ? <section className="command-notice">{notice}</section> : null}{error ? <section className="command-error">{error}</section> : null}
    <section className="command-panel"><p className="smart-command-kicker">Zone 1 · AI Today Plan</p><h2>{best?.title || "No urgent blocker found"}</h2><p>{best ? `${best.reason} ${best.next}` : "AI has not found a major blocker in the loaded data."}</p><div className="command-metric-row"><div className="command-mini-metric"><strong>{groups.dispatch.length}</strong><span>Need crew</span><small>dispatch</small></div><div className="command-mini-metric"><strong>{groups.revenue.length}</strong><span>Revenue</span><small>pricing/invoice</small></div><div className="command-mini-metric"><strong>{groups.follow.length}</strong><span>Follow-ups</span><small>quotes/invoices</small></div><div className="command-mini-metric"><strong>{groups.proof.length}</strong><span>Proof</span><small>proof-to-paid</small></div></div></section>
    <section className="command-next-grid"><button className="command-next-move orange" onClick={() => setDrawer({ kind: "workspace", title: "Dispatch", subtitle: "Assign and balance today" })}><span>Dispatch the day</span><strong>{groups.dispatch.length}</strong><small>AI worker suggestions</small></button><button className="command-next-move blue" onClick={() => setDrawer({ kind: "workspace", title: "Invoices", subtitle: "Move money safely" })}><span>Move money</span><strong>{groups.revenue.length + groups.follow.length}</strong><small>Draft invoices and reminders</small></button><button className="command-next-move dark" onClick={() => setDrawer({ kind: "workspace", title: "Proof-to-Paid", subtitle: "Prepare proof and updates" })}><span>Proof & updates</span><strong>{groups.proof.length}</strong><small>Proof packs and updates</small></button></section>
    <section className="command-panel"><p className="smart-command-kicker">Zone 3 · Active Work Board</p><h2>Work moving now</h2><p>Open a job and edit it inside the drawer.</p><div className="command-record-list">{activeWork.map((j) => <button key={idOf(j)} className="command-record-row" onClick={() => openJob(idOf(j))}><strong>{recordName(j, "Job")}</strong><span>{clientName(j, data.clients)} · {j.status || "open"}</span><em>Work here</em></button>)}</div></section>
    <section className="command-panel"><div className="command-section-head"><div><p className="smart-command-kicker">Zone 4 · AI Approval Control</p><h2>Approve what AI prepared</h2><p>Every action opens inside the drawer first.</p></div><span className="command-pill">{actions.length} ready</span></div><div className="command-filter-grid">{[["All", actions.length], ["Dispatch", groups.dispatch.length], ["Revenue", groups.revenue.length], ["Follow-ups", groups.follow.length], ["Proof", groups.proof.length]].map(([label, count]) => <button key={label} className={count ? "active" : ""} onClick={() => setDrawer({ kind: "approvals", title: `${label} approvals`, subtitle: "Approve or edit inside this drawer", filter: label })}>{label}<span>{count} items</span></button>)}</div></section>
    <section className="command-panel"><p className="smart-command-kicker">Zone 5 · Owner Workspaces</p><h2>Open any part of the business</h2><p>Each workspace opens as an editable drawer. Full-page navigation is only a fallback.</p><div className="command-workspace-grid">{workspaceTiles.map((t) => <button key={t} className="command-workspace-btn" onClick={() => setDrawer({ kind: "workspace", title: t, subtitle: "Work here without leaving Command" })}><strong>{t}</strong><span>Open drawer workspace</span></button>)}</div></section>

    <Drawer drawer={drawer} close={() => setDrawer(null)}>
      {drawer?.kind === "job" ? <JobEditor job={drawer.item} workers={data.workers} clients={data.clients} saveJob={saveJob} execute={execute} /> : null}
      {drawer?.kind === "ask" ? <div className="command-drawer-stack"><div className="command-editor-card"><h3>{drawer.subtitle}</h3><p>{aiAnswer}</p></div><Button onClick={() => askAi("Who should I assign first?")}>Who to assign?</Button><Button onClick={() => askAi("What money is waiting?")}>Money waiting?</Button><Button onClick={() => askAi("What proof packs are missing?")}>Missing proof?</Button></div> : null}
      {drawer?.kind === "approvals" ? <div className="command-action-list">{actions.filter((a) => !drawer.filter || drawer.filter === "All" || norm(a.type).includes(norm(drawer.filter)) || (drawer.filter === "Revenue" && ["invoice", "pricing"].includes(a.type))).slice(0, 20).map((a) => <article className="command-action-card" key={a.id}><div className="command-card-top"><span className={`command-priority ${a.priority}`}>{a.priority}</span><span>{a.type}</span><span className="ready">owner approval</span></div><h3>{a.title}</h3><p>{a.summary}</p><p><b>Why:</b> {a.reason}</p><div className="command-card-actions">{a.job_id ? <Button tone="light" onClick={() => openJob(a.job_id)}>Edit job first</Button> : null}<Button onClick={() => execute(a)}>Approve action</Button></div></article>)}</div> : null}
      {drawer?.kind === "workspace" ? <WorkspaceEditor title={drawer.title} data={data} actions={actions} openJob={openJob} execute={execute} askAi={askAi} saveSettings={saveSettings} /> : null}
    </Drawer>
  </div></main></Layout>;
}
