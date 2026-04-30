import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
const idOf = (x) => txt(x?.id || x?._id || "");
const statusOf = (x) => low(x?.status || x?.job_status || x?.workflow_status || "");
const nameOf = (x) => txt(x?.customer_name || x?.client_name || x?.name || x?.business_name || x?.title || x?.job_title || "Record");
const amountOf = (x) => Number(x?.balance_due || x?.amount_due || x?.total || x?.amount || x?.price || x?.subtotal || x?.job_price || 0) || 0;
const money = (n) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(n || 0));
const unwrap = (settled) => (settled?.status === "fulfilled" && settled.value?.success ? settled.value?.data || {} : null);

function Section({ title, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-black text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function routeFor(type, id) {
  if (type === "team") return "/team";
  if (type === "timesheets") return "/timesheets";
  if (type === "automation") return "/automation";
  if (type === "invoice") return id ? `/invoices/${id}` : "/invoices";
  if (type === "quote") return id ? `/quotes/${id}` : "/quotes";
  if (type === "job") return id ? `/jobs/${id}` : "/jobs";
  return "/dashboard";
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

const localAsk = (question, model) => {
  const q = low(question);
  if (q.includes("owe") || q.includes("money") || q.includes("unpaid")) {
    const total = model.unpaidInvoices.reduce((sum, i) => sum + amountOf(i), 0);
    return `There are ${model.unpaidInvoices.length} unpaid invoices totaling ${money(total)}. ${model.overdueInvoices.length} are overdue.`;
  }
  if (q.includes("unassigned") || q.includes("assign")) return `${model.unassignedJobs.length} open jobs have no assigned worker.`;
  if (q.includes("quote")) return `${model.openQuotes.length} open quotes are waiting, worth about ${money(model.openQuotes.reduce((s, i) => s + amountOf(i), 0))}.`;
  return `Snapshot: ${model.unassignedJobs.length} unassigned jobs, ${model.overdueInvoices.length} overdue invoices, and ${model.completedNoInvoice.length} completed jobs not invoiced.`;
};

function localActions(model) {
  const rows = [];
  if (model.unassignedJobs.length) rows.push({ id: "local-unassigned", title: `Assign ${model.unassignedJobs.length} open jobs`, description: "Open work needs a responsible worker.", priority: "high", confidence: "high", status: "local", route: routeFor("job") });
  if (model.overdueInvoices.length) rows.push({ id: "local-overdue", title: `Chase ${model.overdueInvoices.length} overdue invoices`, description: "Overdue invoices are cash waiting.", priority: "high", confidence: "high", status: "local", route: routeFor("invoice") });
  if (model.completedNoInvoice.length) rows.push({ id: "local-uninvoiced", title: `Invoice ${model.completedNoInvoice.length} completed jobs`, description: "Completed work should become draft invoices.", priority: "high", confidence: "medium", status: "local", route: routeFor("job") });
  if (model.openQuotes.length) rows.push({ id: "local-quotes", title: `Follow up ${model.openQuotes.length} open quotes`, description: `${money(model.openQuotes.reduce((s, q) => s + amountOf(q), 0))} in quote value is waiting for action.`, priority: "medium", confidence: "high", status: "local", route: routeFor("quote") });
  if (model.workerIssues.length) rows.push({ id: "local-workers", title: `Fix ${model.workerIssues.length} worker setup issues`, description: "Missing role, region or rate weakens scheduling and payroll checks.", priority: "medium", confidence: "medium", status: "local", route: routeFor("team") });
  return rows;
}

function localDrafts(model, type = "invoice_reminder") {
  if (type.includes("quote") && model.openQuotes[0]) return [{ id: "local-draft-quote", title: "Quote follow-up draft", type, draft_text: `Hi ${nameOf(model.openQuotes[0])}, just checking in on your quote. Happy to answer any questions or make changes if needed. Thanks.` }];
  if (type.includes("worker") && model.unassignedJobs[0]) return [{ id: "local-draft-worker", title: "Worker instruction draft", type, draft_text: `Please review this job for assignment: ${nameOf(model.unassignedJobs[0])}. Check address, notes and timing before accepting.` }];
  const inv = model.overdueInvoices[0] || model.unpaidInvoices[0];
  return [{ id: "local-draft-invoice", title: "Invoice reminder draft", type, draft_text: inv ? `Hi ${nameOf(inv)}, just a friendly reminder that your invoice is still unpaid. Please let us know if you need anything from us.` : "No invoice draft available yet because no unpaid invoice data is loaded." }];
}

function localIdeas(model) {
  const rows = [];
  rows.push({ id: "local-auto-quotes", title: "Quote follow-up automation", description: "When a quote is pending, create a follow-up task.", status: "local", priority: "medium" });
  rows.push({ id: "local-auto-invoices", title: "Invoice reminder automation", description: "When an invoice is overdue, draft a reminder for owner approval.", status: "local", priority: "high" });
  rows.push({ id: "local-auto-jobs", title: "Completed job to invoice task", description: "When a job is completed, create a draft invoice task.", status: "local", priority: "high" });
  rows.push({ id: "local-auto-unassigned", title: "Unassigned job alert", description: "When a job has no worker, alert the owner or manager.", status: "local", priority: "high" });
  if (model.workerIssues.length) rows.push({ id: "local-auto-workers", title: "Worker setup cleanup", description: "Flag workers missing role, region, or pay rate.", status: "local", priority: "medium" });
  return rows;
}

const localBrief = (model) => ({
  headline: model.overdueInvoices.length || model.unassignedJobs.length ? "High-priority work needs attention" : "Business running with manageable risk",
  summary: `${model.unassignedJobs.length} unassigned jobs, ${model.overdueInvoices.length} overdue invoices, ${model.completedNoInvoice.length} completed jobs not invoiced, ${model.openQuotes.length} open quotes.`,
  recommended_actions: ["Review unassigned jobs.", "Follow up overdue invoices.", "Convert completed jobs into invoices."],
});

function localMemory(model) {
  const rows = [];
  if (model.openQuotes.length >= 3) rows.push({ id: "local-memory-quotes", title: "Quotes are building up", description: `${model.openQuotes.length} quotes are open or pending.`, evidence_count: model.openQuotes.length });
  if (model.unassignedJobs.length >= 3) rows.push({ id: "local-memory-jobs", title: "Jobs need assignment", description: `${model.unassignedJobs.length} jobs have no assigned worker.`, evidence_count: model.unassignedJobs.length });
  if (model.completedNoInvoice.length >= 2) rows.push({ id: "local-memory-invoice", title: "Completed work not invoiced", description: `${model.completedNoInvoice.length} completed jobs appear uninvoiced.`, evidence_count: model.completedNoInvoice.length });
  if (model.overdueInvoices.length >= 2) rows.push({ id: "local-memory-overdue", title: "Repeated unpaid invoices", description: `${model.overdueInvoices.length} invoices are overdue.`, evidence_count: model.overdueInvoices.length });
  if (model.workerIssues.length) rows.push({ id: "local-memory-workers", title: "Worker setup gaps", description: `${model.workerIssues.length} workers have missing setup details.`, evidence_count: model.workerIssues.length });
  return rows;
}

const localProfit = (model) => {
  const cashWaiting = model.unpaidInvoices.reduce((s, i) => s + amountOf(i), 0);
  const openQuoteValue = model.openQuotes.reduce((s, q) => s + amountOf(q), 0);
  const completedNotInvoiced = model.completedNoInvoice.reduce((s, j) => s + amountOf(j), 0);
  const revenueSignal = cashWaiting + openQuoteValue + completedNotInvoiced;
  return { revenueSignal, cashWaiting, openQuoteValue, completedNotInvoiced, estimatedMargin: null, warning: "Profit is not final until expenses and payments are complete." };
};

export default function SafeAIAssistantPage() {
  const { get, post, del } = useApi();
  const navigate = useNavigate();
  const [base, setBase] = useState({ jobs: [], quotes: [], invoices: [], workers: [] });
  const [actions, setActions] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [brief, setBrief] = useState(null);
  const [memory, setMemory] = useState([]);
  const [profit, setProfit] = useState(null);
  const [draftType, setDraftType] = useState("invoice_reminder");
  const [busy, setBusy] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [askQuestion, setAskQuestion] = useState("Who owes money?");
  const [askResult, setAskResult] = useState(null);

  const model = useMemo(() => buildLocalModel(base), [base]);

  const setStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 2800);
  };

  const loadBase = async () => {
    const calls = await Promise.allSettled([get("/jobs"), get("/quotes"), get("/invoices"), get("/team/workers")]);
    setBase({
      jobs: safeArray(unwrap(calls[0]), "jobs"),
      quotes: safeArray(unwrap(calls[1]), "quotes"),
      invoices: safeArray(unwrap(calls[2]), "invoices"),
      workers: safeArray(unwrap(calls[3]), "workers"),
    });
  };

  useEffect(() => { loadBase(); }, []);

  const run = async (label, backendFn, fallbackFn) => {
    setBusy(label);
    let usedFallback = false;
    const timer = setTimeout(() => {
      if (!usedFallback) {
        usedFallback = true;
        fallbackFn?.();
        setStatus("Backend slow, local fallback used.");
      }
      setBusy("");
    }, 5000);
    try {
      const res = await backendFn();
      if (!res?.success) {
        if (!usedFallback) fallbackFn?.();
        setStatus("Generated locally.");
      } else {
        setStatus("Saved.");
      }
    } catch {
      if (!usedFallback) fallbackFn?.();
      setStatus("Generated locally.");
    } finally {
      clearTimeout(timer);
      setBusy("");
    }
  };

  const displayActions = actions.length ? actions : localActions(model);
  const displayDrafts = drafts.length ? drafts : localDrafts(model, draftType);
  const displayIdeas = ideas.length ? ideas : localIdeas(model);
  const displayBrief = brief || localBrief(model);
  const displayMemory = memory.length ? memory : localMemory(model);
  const displayProfit = profit || localProfit(model);

  const handleAsk = async () => {
    setBusy("ask-churvox");
    const localAnswer = localAsk(askQuestion, model);
    const timer = setTimeout(() => {
      setAskResult({ source: "Smart fallback", answer: localAnswer });
      setBusy("");
      setStatus("Backend slow, local fallback used.");
    }, 5000);
    try {
      const res = await post("/ai/ask", { question: askQuestion });
      clearTimeout(timer);
      if (res?.success && txt(res?.data?.answer || res?.data?.response)) {
        setAskResult({ source: res?.data?.used_ai ? "Real AI" : "Smart fallback", answer: txt(res?.data?.answer || res?.data?.response) });
      } else {
        setAskResult({ source: "Smart fallback", answer: localAnswer });
        setStatus("Generated locally.");
      }
    } catch {
      clearTimeout(timer);
      setAskResult({ source: "Smart fallback", answer: localAnswer });
      setStatus("Generated locally.");
    } finally {
      setBusy("");
    }
  };

  return <Layout><div className="cx-page space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h1 className="text-3xl font-black">AI Business Assistant</h1><p className="text-sm text-slate-600">AI suggests. You approve. Nothing is changed automatically.</p><p className="text-sm text-slate-600">AI drafts only. Nothing is sent without your approval.</p><p className="text-sm text-slate-600">AI does not approve payroll, change prices, mark invoices paid, assign workers, change job status, or sync MYOB.</p>{busy && <p className="mt-2 text-xs font-bold text-blue-700">Working: {busy}...</p>}{statusMsg && <p className="mt-2 text-xs text-emerald-700">{statusMsg}</p>}</section>

    <Section title="Ask Churvox"><div className="flex gap-2"><input className="w-full rounded border px-2 py-1 text-sm" value={askQuestion} onChange={(e) => setAskQuestion(e.target.value)} /><button className="rounded border px-2 py-1 text-xs" onClick={handleAsk}>Ask</button></div>{askResult && <div className="mt-2 rounded border p-2 text-sm"><div className="text-xs font-bold">{askResult.source}</div><p>{askResult.answer}</p></div>}</Section>

    <Section title="Daily Brief"><button className="rounded border px-2 py-1 text-xs" onClick={() => run("daily-brief", () => post("/ai/daily-brief/generate", {}), () => setBrief(localBrief(model)))}>Generate daily brief</button><div className="mt-3 text-sm"><p><b>{displayBrief.headline}</b></p><p>{displayBrief.summary}</p><ul className="list-disc pl-5">{(displayBrief.recommended_actions || []).map((r) => <li key={r}>{r}</li>)}</ul></div></Section>

    <Section title="Saved AI Actions"><button className="rounded border px-2 py-1 text-xs" onClick={() => run("generate-actions", () => post("/ai/actions/generate", {}), () => setActions(localActions(model)))}>Generate saved actions</button>{displayActions.length === 0 ? <p className="text-sm">No urgent actions found.</p> : displayActions.map((a) => <div key={a.id} className="mt-2 rounded border p-3 text-sm"><b>{a.title}</b><p>{a.description}</p><div className="text-xs">{a.priority}/{a.confidence} • {a.status}</div><div className="mt-2 flex flex-wrap gap-2 text-xs"><Link className="rounded bg-blue-600 px-3 py-1 text-white" to={a.route || routeFor("job")}>Open</Link><button onClick={() => { if (a.id.startsWith("local-")) { setActions((prev) => prev.filter((x) => x.id !== a.id)); setStatus("Dismissed."); } else { run(`action-dismiss-${a.id}`, () => post(`/ai/actions/${a.id}/dismiss`, {})); } }}>Dismiss</button><button onClick={() => { if (a.id.startsWith("local-")) { setActions((prev) => prev.filter((x) => x.id !== a.id)); setStatus("Saved."); } else { run(`action-complete-${a.id}`, () => post(`/ai/actions/${a.id}/complete`, {})); } }}>Complete</button><button onClick={() => { if (a.id.startsWith("local-")) { setStatus("Approved for review. Nothing changed automatically."); } else { run(`action-approve-${a.id}`, () => post(`/ai/actions/${a.id}/approve`, {})); } }}>Approve</button></div></div>)}</Section>

    <Section title="Saved AI Drafts"><div className="flex flex-wrap gap-2"><select value={draftType} onChange={(e) => setDraftType(e.target.value)} className="rounded border px-2 py-1 text-xs"><option>quote_follow_up</option><option>invoice_reminder</option><option>job_reminder</option><option>job_completion_summary</option><option>customer_update</option><option>worker_instruction</option><option>quote_wording</option><option>invoice_wording</option><option>client_missing_details_request</option></select><button className="rounded border px-2 py-1 text-xs" onClick={() => run("create-draft", () => post("/ai/drafts/create", { type: draftType }), () => setDrafts(localDrafts(model, draftType)))}>Create draft</button></div>{displayDrafts.length === 0 ? <p className="text-sm">No drafts available yet.</p> : displayDrafts.map((d) => <div key={d.id} className="mt-2 rounded border p-3 text-sm"><b>{d.title || d.type}</b><p>{d.draft_text}</p><div className="flex flex-wrap gap-2 text-xs"><button onClick={async () => { await navigator.clipboard.writeText(txt(d.draft_text)); setStatus("Draft copied. Review before sending."); }}>Copy draft</button><button onClick={() => { if (d.id.startsWith("local-")) { setDrafts((prev) => prev.filter((x) => x.id !== d.id)); setStatus("Saved."); } else { run(`draft-mark-used-${d.id}`, () => post(`/ai/drafts/${d.id}/mark-used`, {})); } }}>Mark used</button><button onClick={() => { if (d.id.startsWith("local-")) { setDrafts((prev) => prev.filter((x) => x.id !== d.id)); setStatus("Dismissed."); } else { run(`draft-dismiss-${d.id}`, () => post(`/ai/drafts/${d.id}/dismiss`, {})); } }}>Dismiss</button><button onClick={() => { if (d.id.startsWith("local-")) { setDrafts((prev) => prev.filter((x) => x.id !== d.id)); setStatus("Dismissed."); } else { run(`draft-delete-${d.id}`, () => del(`/ai/drafts/${d.id}`)); } }}>Delete</button></div></div>)}</Section>

    <Section title="Saved Automation Ideas"><button className="rounded border px-2 py-1 text-xs" onClick={() => run("generate-automation", () => post("/ai/automation-suggestions/generate", {}), () => setIdeas(localIdeas(model)))}>Generate automation suggestions</button>{displayIdeas.length === 0 ? <p className="text-sm">No automation suggestions yet.</p> : displayIdeas.map((s) => <div key={s.id} className="mt-2 rounded border p-3 text-sm"><b>{s.title}</b><p>{s.description}</p><div className="text-xs">{s.status} • AI suggests. You approve.</div><div className="flex flex-wrap gap-2 text-xs"><button onClick={() => navigate(routeFor("automation"))}>Open Automation</button><button onClick={() => { if (s.id.startsWith("local-")) { setStatus("Approved for review. Nothing changed automatically."); } else { run(`idea-approve-${s.id}`, () => post(`/ai/automation-suggestions/${s.id}/approve`, {})); } }}>Approve</button><button onClick={() => { if (s.id.startsWith("local-")) { setIdeas((prev) => prev.filter((x) => x.id !== s.id)); setStatus("Dismissed."); } else { run(`idea-dismiss-${s.id}`, () => post(`/ai/automation-suggestions/${s.id}/dismiss`, {})); } }}>Dismiss</button><button onClick={() => { if (s.id.startsWith("local-")) { setIdeas((prev) => prev.filter((x) => x.id !== s.id)); setStatus("Saved."); } else { run(`idea-snooze-${s.id}`, () => post(`/ai/automation-suggestions/${s.id}/snooze`, {})); } }}>Snooze</button></div></div>)}</Section>

    <Section title="Business Memory"><button className="rounded border px-2 py-1 text-xs" onClick={() => run("business-memory", () => post("/ai/business-memory/refresh", {}), () => setMemory(localMemory(model)))}>Refresh memory</button>{displayMemory.length === 0 ? <p className="text-sm">No recurring patterns found yet.</p> : displayMemory.map((m) => <div key={m.id} className="mt-2 rounded border p-3 text-sm"><b>{m.title}</b><p>{m.description}</p>{m.evidence_count ? <div className="text-xs">Evidence: {m.evidence_count}</div> : null}<button className="text-xs" onClick={() => { if (m.id.startsWith("local-")) { setMemory((prev) => prev.filter((x) => x.id !== m.id)); setStatus("Dismissed."); } else { run("dismiss-memory", () => post(`/ai/business-memory/${m.id}/dismiss`, {})); } }}>Dismiss</button></div>)}</Section>

    <Section title="Profit Foundations"><button className="rounded border px-2 py-1 text-xs" onClick={() => setProfit(localProfit(model))}>Generate profit snapshot</button><div className="mt-3 text-sm"><p>Revenue signal: {money(displayProfit.revenueSignal)}</p><p>Cash waiting: {money(displayProfit.cashWaiting)}</p><p>Open quote value: {money(displayProfit.openQuoteValue)}</p><p>Completed-not-invoiced estimate: {money(displayProfit.completedNotInvoiced)}</p>{displayProfit.estimatedMargin !== null && <p>Estimated margin: {money(displayProfit.estimatedMargin)}</p>}<p>{txt(displayProfit.warning, "Profit is not final until expenses and payments are complete.")}</p></div></Section>
  </div></Layout>;
}
