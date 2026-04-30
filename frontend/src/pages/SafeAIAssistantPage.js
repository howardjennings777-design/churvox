import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";

const safeArray = (value, key) => {
  if (Array.isArray(value)) return value;
  if (key && Array.isArray(value?.[key])) return value[key];
  if (key && Array.isArray(value?.data?.[key])) return value.data[key];
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.quotes)) return value.quotes;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.workers)) return value.workers;
  return [];
};
const txt = (v, f = "") => (v === null || v === undefined || v === "" ? f : String(v));
const low = (v) => txt(v).toLowerCase().trim();
const statusOf = (x) => low(x?.status || x?.job_status || x?.workflow_status || "");
const nameOf = (x) => txt(x?.customer_name || x?.client_name || x?.name || x?.business_name || x?.title || x?.job_title || "Record");
const amountOf = (x) => Number(x?.balance_due || x?.amount_due || x?.total || x?.amount || x?.price || x?.subtotal || x?.job_price || 0) || 0;
const money = (n) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(n || 0));
const unwrap = (settled) => settled?.status === "fulfilled" && settled.value?.success ? (settled.value?.data || {}) : null;

function Section({ title, children }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black text-slate-950">{title}</h2><div className="mt-3">{children}</div></section>;
}

function buildLocalModel(base) {
  const jobs = base.jobs || [];
  const quotes = base.quotes || [];
  const invoices = base.invoices || [];
  const workers = base.workers || [];
  const openJobs = jobs.filter((j) => !["completed", "complete", "done", "cancelled", "canceled"].includes(statusOf(j)));
  const unassignedJobs = openJobs.filter((j) => !(j.assigned_worker_id || j.worker_id || j.assigned_to || j.assigned_worker_name || j.worker_name));
  const completedNoInvoice = jobs.filter((j) => ["completed", "complete", "done"].includes(statusOf(j)) && !(j.invoice_id || j.invoice_number));
  const stuckJobs = jobs.filter((j) => ["paused", "stuck", "blocked", "on_hold"].includes(statusOf(j)));
  const openQuotes = quotes.filter((q) => ["draft", "sent", "pending", "open", ""].includes(statusOf(q)));
  const unpaidInvoices = invoices.filter((i) => !["paid", "void", "cancelled", "canceled"].includes(statusOf(i)));
  const overdueInvoices = unpaidInvoices.filter((i) => statusOf(i) === "overdue");
  const workerIssues = workers.filter((w) => !(w.role || w.position) || !(w.region || w.location) || !(w.rate || w.hourly_rate || w.pay_rate));
  return { jobs, quotes, invoices, workers, openJobs, unassignedJobs, completedNoInvoice, stuckJobs, openQuotes, unpaidInvoices, overdueInvoices, workerIssues };
}

const localActions = (m) => {
  const rows = [];
  if (m.unassignedJobs.length) rows.push({ id: "local-unassigned", title: `Assign ${m.unassignedJobs.length} open jobs`, description: "Open work needs a responsible worker.", priority: "high", confidence: "high", status: "local", route: "/jobs" });
  if (m.overdueInvoices.length) rows.push({ id: "local-overdue", title: `Chase ${m.overdueInvoices.length} overdue invoices`, description: "Overdue invoices are cash waiting.", priority: "high", confidence: "high", status: "local", route: "/invoices" });
  if (m.completedNoInvoice.length) rows.push({ id: "local-uninvoiced", title: `Invoice ${m.completedNoInvoice.length} completed jobs`, description: "Completed work should become draft invoices.", priority: "high", confidence: "medium", status: "local", route: "/jobs" });
  if (m.openQuotes.length) rows.push({ id: "local-quotes", title: `Follow up ${m.openQuotes.length} open quotes`, description: `${money(m.openQuotes.reduce((s, q) => s + amountOf(q), 0))} in quote value is waiting for action.`, priority: "medium", confidence: "high", status: "local", route: "/quotes" });
  if (m.workerIssues.length) rows.push({ id: "local-workers", title: `Fix ${m.workerIssues.length} worker setup issues`, description: "Missing role, region or rate weakens scheduling and payroll checks.", priority: "medium", confidence: "medium", status: "local", route: "/team" });
  return rows;
};

const localDrafts = (m, type = "invoice_reminder") => {
  if (type.includes("quote") && m.openQuotes[0]) return [{ id: "local-draft-quote", title: "Quote follow-up draft", type, draft_text: `Hi ${nameOf(m.openQuotes[0])}, just checking in on your quote. Happy to answer any questions or make any changes if needed. Thanks.` }];
  if (type.includes("worker") && m.unassignedJobs[0]) return [{ id: "local-draft-worker", title: "Worker instruction draft", type, draft_text: `Please review this job for assignment: ${nameOf(m.unassignedJobs[0])}. Check the address, notes and timing before accepting.` }];
  if ((type.includes("job") || type.includes("customer")) && m.stuckJobs[0]) return [{ id: "local-draft-job", title: "Customer job update draft", type, draft_text: `Hi ${nameOf(m.stuckJobs[0])}, quick update on your job. We are reviewing the schedule and will keep you updated before anything changes. Thanks.` }];
  const inv = m.overdueInvoices[0] || m.unpaidInvoices[0];
  return [{ id: "local-draft-invoice", title: "Invoice reminder draft", type, draft_text: inv ? `Hi ${nameOf(inv)}, just a friendly reminder that your invoice is still showing as unpaid. Please let us know if you need anything from us. Thanks.` : "No invoice draft available yet because no unpaid invoice data is loaded." }];
};

const localIdeas = (m) => {
  const rows = [];
  if (m.openQuotes.length) rows.push({ id: "local-auto-quotes", title: "Quote follow-up automation", description: "When a quote is pending for a few days, create a follow-up task.", status: "local", priority: "medium" });
  if (m.overdueInvoices.length) rows.push({ id: "local-auto-invoices", title: "Invoice reminder automation", description: "When an invoice becomes overdue, draft a reminder for owner approval.", status: "local", priority: "high" });
  if (m.completedNoInvoice.length) rows.push({ id: "local-auto-jobs", title: "Completed job to invoice task", description: "When a job is completed, create a draft invoice task.", status: "local", priority: "high" });
  if (m.unassignedJobs.length) rows.push({ id: "local-auto-unassigned", title: "Unassigned job alert", description: "When a job has no worker, alert the owner or manager.", status: "local", priority: "high" });
  return rows;
};

const localBrief = (m) => {
  const risk = m.overdueInvoices.length || m.unassignedJobs.length || m.completedNoInvoice.length || m.stuckJobs.length ? "high" : m.openQuotes.length || m.unpaidInvoices.length ? "medium" : "low";
  return { headline: risk === "high" ? "High-priority work needs attention" : risk === "medium" ? "Some revenue and workflow items need review" : "No urgent issues found", summary: `${m.unassignedJobs.length} unassigned jobs, ${m.overdueInvoices.length} overdue invoices, ${m.completedNoInvoice.length} completed jobs not invoiced, and ${m.openQuotes.length} open quotes.` };
};

const localMemory = (m) => {
  const rows = [];
  if (m.openQuotes.length >= 3) rows.push({ id: "local-memory-quotes", title: "Quotes are building up", description: `${m.openQuotes.length} quotes are open or pending.`, evidence_count: m.openQuotes.length });
  if (m.unassignedJobs.length >= 3) rows.push({ id: "local-memory-jobs", title: "Jobs need assignment", description: `${m.unassignedJobs.length} jobs have no assigned worker.`, evidence_count: m.unassignedJobs.length });
  if (m.completedNoInvoice.length >= 2) rows.push({ id: "local-memory-invoice", title: "Completed work is not becoming invoices", description: `${m.completedNoInvoice.length} completed jobs appear uninvoiced.`, evidence_count: m.completedNoInvoice.length });
  return rows;
};

const localProfit = (m) => {
  const unpaid = m.unpaidInvoices.reduce((s, i) => s + amountOf(i), 0);
  const quotes = m.openQuotes.reduce((s, q) => s + amountOf(q), 0);
  const uninvoiced = m.completedNoInvoice.reduce((s, j) => s + amountOf(j), 0);
  return { revenue_signal: unpaid + quotes + uninvoiced, estimated_margin: 0, unpaid_invoice_value: unpaid, warning: "Revenue signal only. Profit is not final until expenses and payments are complete." };
};

export default function SafeAIAssistantPage() {
  const { get, post, del } = useApi();
  const [base, setBase] = useState({ jobs: [], quotes: [], invoices: [], workers: [] });
  const [actions, setActions] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [brief, setBrief] = useState(null);
  const [memory, setMemory] = useState([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [draftType, setDraftType] = useState("invoice_reminder");
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState({});
  const [loading, setLoading] = useState({ base: false, saved: false });

  const setBusyKey = (key, value) => setBusy((prev) => ({ ...prev, [key]: value }));
  const isBusy = (key) => !!busy[key];

  const model = useMemo(() => buildLocalModel(base), [base]);
  const displayProfit = useMemo(() => localProfit(model), [model]);

  const withTimeout = useCallback(async (promiseFactory, ms = 5000) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("timeout")), ms);
    });
    try {
      return await Promise.race([promiseFactory(), timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  const loadBase = useCallback(async () => {
    setLoading((p) => ({ ...p, base: true }));
    const calls = await Promise.allSettled([get("/jobs"), get("/quotes"), get("/invoices"), get("/team/workers")]);
    setBase({
      jobs: safeArray(unwrap(calls[0]), "jobs"),
      quotes: safeArray(unwrap(calls[1]), "quotes"),
      invoices: safeArray(unwrap(calls[2]), "invoices"),
      workers: safeArray(unwrap(calls[3]), "workers")
    });
    setLoading((p) => ({ ...p, base: false }));
  }, [get]);

  const loadSaved = useCallback(async () => {
    setLoading((p) => ({ ...p, saved: true }));
    const calls = await Promise.allSettled([get("/ai/actions"), get("/ai/drafts"), get("/ai/automation-suggestions"), get("/ai/daily-brief"), get("/ai/business-memory")]);
    const a = unwrap(calls[0]); if (a) setActions(safeArray(a, "actions"));
    const d = unwrap(calls[1]); if (d) setDrafts(safeArray(d, "drafts"));
    const s = unwrap(calls[2]); if (s) setIdeas(safeArray(s, "suggestions"));
    const b = unwrap(calls[3]); if (b) setBrief(b.brief || b.daily_brief || null);
    const m = unwrap(calls[4]); if (m) setMemory(safeArray(m, "memory"));
    setSavedLoaded(true);
    setLoading((p) => ({ ...p, saved: false }));
    setWarnings([]);
  }, [get]);

  useEffect(() => { loadBase(); }, [loadBase]);

  const run = useCallback(async (key, backendFn, fallbackFn, refreshBase = false) => {
    setBusyKey(key, true);
    try {
      const res = await withTimeout(backendFn, 5000);
      if (!res?.success) fallbackFn?.();
      if (refreshBase) await loadBase();
    } catch {
      fallbackFn?.();
    } finally {
      setBusyKey(key, false);
    }
  }, [withTimeout, loadBase]);

  const displayActions = actions.length ? actions : localActions(model);
  const displayDrafts = drafts.length ? drafts : localDrafts(model, draftType);
  const displayIdeas = ideas.length ? ideas : localIdeas(model);
  const displayBrief = brief || localBrief(model);
  const displayMemory = memory.length ? memory : localMemory(model);

  const mutateAction = (id, op) => id.startsWith("local-") ? null : run(`action-${op}-${id}`, () => post(`/ai/actions/${id}/${op}`, {}));
  const mutateIdea = (id, op) => id.startsWith("local-") ? null : run(`idea-${op}-${id}`, () => post(`/ai/automation-suggestions/${id}/${op}`, {}));
  const mutateDraft = (id, op) => id.startsWith("local-") ? null : run(`draft-${op}-${id}`, () => op === "delete" ? del(`/ai/drafts/${id}`) : post(`/ai/drafts/${id}/${op}`, {}));

  return <Layout><div className="cx-page space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h1 className="text-3xl font-black">AI Business Assistant</h1><p className="text-sm text-slate-600">AI suggests. You approve. No emails, SMS, payroll, MYOB sync, pricing, status, or customer data changes happen automatically.</p>{loading.base && <p className="mt-2 text-xs text-blue-700">Loading jobs, quotes, invoices and workers...</p>}<div className="mt-3"><button className="rounded border px-2 py-1 text-xs" onClick={loadSaved} disabled={loading.saved}>{loading.saved ? "Loading saved AI data..." : (savedLoaded ? "Reload saved AI data" : "Load saved AI data")}</button></div></section>
    {warnings.length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{warnings.join(" ")}</section>}

    <Section title="Daily Brief"><button className="rounded border px-2 py-1 text-xs" disabled={isBusy("daily-brief")} onClick={() => run("daily-brief", () => post('/ai/daily-brief/generate',{}), () => setBrief(localBrief(model)))}>{isBusy("daily-brief") ? "Working..." : "Generate daily brief"}</button><div className="mt-3 text-sm"><p><b>{displayBrief.headline}</b></p><p>{displayBrief.summary}</p></div></Section>

    <Section title="Saved AI Actions"><button className="rounded border px-2 py-1 text-xs" disabled={isBusy("generate-actions")} onClick={() => run("generate-actions", () => post('/ai/actions/generate',{}), () => setActions(localActions(model)))}>{isBusy("generate-actions") ? "Working..." : "Generate saved actions"}</button>{displayActions.length === 0 ? <p className="text-sm">No urgent actions found.</p> : displayActions.map(a => <div key={a.id} className="mt-2 rounded border p-3 text-sm"><b>{a.title}</b><p>{a.description}</p><div className="text-xs">{a.priority}/{a.confidence} • {a.status}</div><div className="mt-2 flex flex-wrap gap-2 text-xs"><Link className="rounded bg-blue-600 px-3 py-1 text-white" to={a.route || "/dashboard"}>Open</Link>{!a.id.startsWith("local-") && <><button disabled={isBusy(`action-dismiss-${a.id}`)} onClick={()=>mutateAction(a.id,'dismiss')}>Dismiss</button><button disabled={isBusy(`action-snooze-${a.id}`)} onClick={()=>mutateAction(a.id,'snooze')}>Snooze</button><button disabled={isBusy(`action-complete-${a.id}`)} onClick={()=>mutateAction(a.id,'complete')}>Complete</button><button disabled={isBusy(`action-approve-${a.id}`)} onClick={()=>mutateAction(a.id,'approve')}>Approve</button></>}</div></div>)}</Section>

    <Section title="Saved AI Drafts"><div className="flex flex-wrap gap-2"><select value={draftType} onChange={(e)=>setDraftType(e.target.value)} className="rounded border px-2 py-1 text-xs"><option>quote_follow_up</option><option>invoice_reminder</option><option>job_reminder</option><option>job_completion_summary</option><option>customer_update</option><option>worker_instruction</option><option>quote_wording</option><option>invoice_wording</option><option>client_missing_details_request</option></select><button className="rounded border px-2 py-1 text-xs" disabled={isBusy("create-draft")} onClick={() => run("create-draft", () => post('/ai/drafts/create',{type:draftType}), () => setDrafts(localDrafts(model, draftType)))}>{isBusy("create-draft") ? "Working..." : "Create draft"}</button></div>{displayDrafts.length === 0 ? <p className="text-sm">No drafts available yet.</p> : displayDrafts.map(d => <div key={d.id} className="mt-2 rounded border p-3 text-sm"><b>{d.title || d.type}</b><p>{d.draft_text}</p><div className="flex flex-wrap gap-2 text-xs"><button onClick={async()=>{await navigator.clipboard.writeText(txt(d.draft_text));setCopied(d.id);}}>Copy draft</button>{!d.id.startsWith("local-") && <><button disabled={isBusy(`draft-mark-used-${d.id}`)} onClick={()=>mutateDraft(d.id,'mark-used')}>Mark used</button><button disabled={isBusy(`draft-dismiss-${d.id}`)} onClick={()=>mutateDraft(d.id,'dismiss')}>Dismiss</button><button disabled={isBusy(`draft-delete-${d.id}`)} onClick={()=>mutateDraft(d.id,'delete')}>Delete</button></>}</div>{copied===d.id&&<div className="text-xs text-emerald-700">Draft copied. Review before sending.</div>}</div>)}</Section>

    <Section title="Saved Automation Ideas"><button className="rounded border px-2 py-1 text-xs" disabled={isBusy("generate-automation")} onClick={() => run("generate-automation", () => post('/ai/automation-suggestions/generate',{}), () => setIdeas(localIdeas(model)))}>{isBusy("generate-automation") ? "Working..." : "Generate automation suggestions"}</button>{displayIdeas.length === 0 ? <p className="text-sm">No automation suggestions yet.</p> : displayIdeas.map(s => <div key={s.id} className="mt-2 rounded border p-3 text-sm"><b>{s.title}</b><p>{s.description}</p><div className="text-xs">{s.status} • AI suggests. You approve.</div><div className="flex flex-wrap gap-2 text-xs"><Link to="/automation">Open Automation</Link>{!s.id.startsWith("local-") && <><button disabled={isBusy(`idea-approve-${s.id}`)} onClick={()=>mutateIdea(s.id,'approve')}>Approve</button><button disabled={isBusy(`idea-dismiss-${s.id}`)} onClick={()=>mutateIdea(s.id,'dismiss')}>Dismiss</button><button disabled={isBusy(`idea-snooze-${s.id}`)} onClick={()=>mutateIdea(s.id,'snooze')}>Snooze</button></>}</div></div>)}</Section>

    <Section title="Business Memory"><button className="rounded border px-2 py-1 text-xs" disabled={isBusy("business-memory")} onClick={() => run("business-memory", () => post('/ai/business-memory/refresh',{}), () => setMemory(localMemory(model)))}>{isBusy("business-memory") ? "Working..." : "Refresh memory"}</button>{displayMemory.length === 0 ? <p className="text-sm">No recurring patterns found yet.</p> : displayMemory.map(m => <div key={m.id} className="mt-2 rounded border p-3 text-sm"><b>{m.title}</b><p>{m.description}</p>{m.evidence_count ? <div className="text-xs">Evidence: {m.evidence_count}</div> : null}{!m.id.startsWith("local-") && <button className="text-xs" disabled={isBusy(`dismiss-memory-${m.id}`)} onClick={() => run(`dismiss-memory-${m.id}`, () => post(`/ai/business-memory/${m.id}/dismiss`,{}))}>Dismiss</button>}</div>)}</Section>

    <Section title="Profit Foundations"><button className="rounded border px-2 py-1 text-xs" onClick={() => {}}>Generate profit snapshot</button><div className="mt-3 text-sm"><p>Revenue signal: {money(displayProfit.revenue_signal)}</p><p>Estimated margin: {money(displayProfit.estimated_margin)}</p><p>Cash waiting: {money(displayProfit.unpaid_invoice_value)}</p><p>{txt(displayProfit.warning,"Profit is not final until expenses and payments are complete.")}</p></div></Section>
  </div></Layout>;
}
