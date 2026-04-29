import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { Bot, Briefcase, FileText, Receipt, ShieldCheck, Sparkles, Users } from "lucide-react";

const normalize = (value) => String(value || "").trim().toLowerCase();
const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const extractList = (data, keys = []) => Array.isArray(data) ? data : (keys.find((k) => Array.isArray(data?.[k])) ? data[keys.find((k) => Array.isArray(data?.[k]))] : []);
const getItemId = (item) => String(item?.id || item?._id || item?.invoice_id || item?.quote_id || item?.job_id || "");
const getCustomer = (item) => item?.customer_name || item?.client_name || item?.customer?.name || item?.client?.name || "Customer";
const getAmount = (item) => toNumber(item?.total || item?.amount || item?.total_amount || item?.grand_total || item?.balance_due || 0);
const getDueDate = (item) => { const d = new Date(item?.due_date || item?.dueDate || item?.target_date || item?.targetDate || ""); return Number.isNaN(d.getTime()) ? null : d; };
const assigned = (job) => Boolean(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || job?.assigned_worker_name || job?.worker_name);
const isQuoteOpen = (quote) => ["pending", "open", "sent", "draft"].includes(normalize(quote?.status));
const isInvoicePaid = (inv) => { const status = normalize(inv?.status || inv?.payment_status); return Boolean(inv?.paid_at || inv?.date_paid || inv?.is_paid || status === "paid"); };
const money = (v) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v || 0);

export default function SafeAIAssistantPage() {
  const { get, post } = useApi();
  const [jobs, setJobs] = useState([]); const [quotes, setQuotes] = useState([]); const [invoices, setInvoices] = useState([]); const [workers, setWorkers] = useState([]); const [copiedDraftId, setCopiedDraftId] = useState("");
  const [askQuestion, setAskQuestion] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askResult, setAskResult] = useState(null);

  useEffect(() => { let active = true; (async () => {
    const [jr, qr, ir, wr] = await Promise.allSettled([get("/jobs"), get("/quotes"), get("/invoices"), get("/team/workers")]);
    if (!active) return;
    if (jr.status === "fulfilled" && jr.value?.success) setJobs(extractList(jr.value.data, ["jobs", "items", "data"]));
    if (qr.status === "fulfilled" && qr.value?.success) setQuotes(extractList(qr.value.data, ["quotes", "items", "data"]));
    if (ir.status === "fulfilled" && ir.value?.success) setInvoices(extractList(ir.value.data, ["invoices", "items", "data"]));
    if (wr.status === "fulfilled" && wr.value?.success) setWorkers(extractList(wr.value.data, ["workers", "items", "data"]));
  })(); return () => { active = false; }; }, [get]);

  const data = useMemo(() => {
    const now = new Date();
    const unpaidInvoices = invoices.filter((i) => !isInvoicePaid(i));
    const overdueInvoices = unpaidInvoices.filter((i) => { const due = getDueDate(i); return due && due < now; });
    const unassignedJobs = jobs.filter((j) => !assigned(j));
    const pausedJobs = jobs.filter((j) => ["paused", "stuck", "on hold", "on-hold", "blocked"].includes(normalize(j?.status)));
    const completedNotInvoiced = jobs.filter((j) => normalize(j?.status) === "completed" && !Boolean(j?.invoice_id || j?.invoice_number || j?.is_invoiced));
    const openQuotes = quotes.filter(isQuoteOpen);
    const workerMissingRole = workers.filter((w) => !String(w?.role || w?.position || "").trim());
    const workerMissingRegion = workers.filter((w) => !String(w?.region || w?.area || w?.location || "").trim());
    const workerMissingRate = workers.filter((w) => [w?.rate, w?.hourly_rate, w?.pay_rate].every((v) => !toNumber(v)));
    const workerMissingContact = workers.filter((w) => !String(w?.phone || w?.mobile || "").trim() || !String(w?.email || "").trim());
    return { unpaidInvoices, overdueInvoices, unassignedJobs, pausedJobs, completedNotInvoiced, openQuotes, workerMissingRole, workerMissingRegion, workerMissingRate, workerMissingContact };
  }, [jobs, quotes, invoices, workers]);

  const riskLevel = data.overdueInvoices.length || data.unassignedJobs.length || data.completedNotInvoiced.length || data.pausedJobs.length || data.workerMissingRole.length ? "high" : (jobs.length || data.openQuotes.length || data.unpaidInvoices.length || data.workerMissingContact.length ? "medium" : "low");
  const priorityClasses = { high: "border-red-200 bg-red-50 text-red-700", medium: "border-amber-200 bg-amber-50 text-amber-700", low: "border-blue-200 bg-blue-50 text-blue-700" };

  const handleCopy = async (id, text) => { try { await navigator.clipboard.writeText(text); setCopiedDraftId(id); setTimeout(() => setCopiedDraftId(""), 2500); } catch { setCopiedDraftId(""); } };
  const buildLocalFallback = (question) => {
    const normalizedQuestion = normalize(question);
    if (!normalizedQuestion) return "Ask about unpaid invoices, open quotes, or jobs needing action.";
    if (normalizedQuestion.includes("owe") || normalizedQuestion.includes("money") || normalizedQuestion.includes("invoice")) {
      if (!data.unpaidInvoices.length) return "No unpaid invoices found right now.";
      const top = data.unpaidInvoices
        .slice()
        .sort((a, b) => getAmount(b) - getAmount(a))
        .slice(0, 3)
        .map((item) => `${getCustomer(item)} (${money(getAmount(item))})`);
      return `Unpaid invoices: ${data.unpaidInvoices.length}. Top balances: ${top.join(", ")}.`;
    }
    if (normalizedQuestion.includes("job") && (normalizedQuestion.includes("action") || normalizedQuestion.includes("need"))) {
      return `Jobs needing action: ${data.unassignedJobs.length} unassigned, ${data.pausedJobs.length} paused/stuck, ${data.completedNotInvoiced.length} completed not invoiced.`;
    }
    if (normalizedQuestion.includes("quote") || normalizedQuestion.includes("follow-up")) {
      return `Quotes to follow up: ${data.openQuotes.length} pending/open.`;
    }
    if (normalizedQuestion.includes("today") || normalizedQuestion.includes("next")) {
      const steps = [];
      if (data.overdueInvoices.length) steps.push(`follow up ${data.overdueInvoices.length} overdue invoices`);
      if (data.unassignedJobs.length) steps.push(`assign ${data.unassignedJobs.length} unassigned jobs`);
      if (data.completedNotInvoiced.length) steps.push(`invoice ${data.completedNotInvoiced.length} completed jobs`);
      if (!steps.length) steps.push("review open quotes and confirm priorities");
      return `Suggested next steps: ${steps.join("; ")}.`;
    }
    return `Current priorities: ${data.overdueInvoices.length} overdue invoices, ${data.unassignedJobs.length} unassigned jobs, ${data.openQuotes.length} open quotes.`;
  };
  const handleAsk = async (event) => {
    event.preventDefault();
    const question = askQuestion.trim();
    if (!question) return;
    setAskLoading(true);
    try {
      const res = await post("/ai/ask", { question });
      if (res?.success) {
        const payload = res.data?.data || res.data || {};
        const answer = payload?.answer || payload?.message || buildLocalFallback(question);
        const usedAI = Boolean(payload?.used_ai);
        setAskResult({ answer, usedAI, reason: payload?.reason || payload?.message || "" });
      } else {
        setAskResult({ answer: buildLocalFallback(question), usedAI: false, reason: res?.error || "AI endpoint unavailable." });
      }
    } catch {
      setAskResult({ answer: buildLocalFallback(question), usedAI: false, reason: "AI endpoint unavailable." });
    } finally {
      setAskLoading(false);
    }
  };

  const actionQueue = [
    ["unassigned", "Unassigned jobs", data.unassignedJobs.length, "Jobs need worker assignment.", "high", "high", "/jobs"],
    ["completed", "Completed jobs not invoiced", data.completedNotInvoiced.length, "Completed jobs missing invoice linkage.", "high", "high", "/jobs"],
    ["unpaid", "Unpaid invoices", data.unpaidInvoices.length, "Cash waiting from unpaid invoices.", "medium", "high", "/invoices"],
    ["overdue", "Overdue invoices", data.overdueInvoices.length, "Overdue invoices are a cash risk.", "high", "high", "/invoices"],
    ["quotes", "Pending/open quotes", data.openQuotes.length, "Follow-up may improve conversion.", "medium", "medium", "/quotes"],
    ["setup", "Missing worker setup", data.workerMissingRole.length + data.workerMissingRegion.length + data.workerMissingRate.length, "Team data gaps may affect scheduling/payroll.", "medium", "medium", "/team"],
    ["paused", "Paused/stuck jobs", data.pausedJobs.length, "Paused jobs may impact delivery timelines.", "high", "medium", "/jobs"],
  ].filter((i) => i[2] > 0);

  return (
    <Layout>
      <div className="cx-page space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-blue-50 to-slate-50 p-6 shadow-sm">
          <h1 className="text-3xl font-black text-slate-950">AI Business Assistant</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">AI suggests. You approve. Nothing is changed automatically.</p>
          <p className="text-sm font-semibold text-slate-600">AI drafts only. Nothing is sent without your approval.</p>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Sparkles className="inline h-5 w-5"/> AI Daily Brief</h2><p className="mt-2">Risk: <span className={`rounded-full border px-2 py-1 text-xs ${priorityClasses[riskLevel]}`}>{riskLevel}</span></p><p className="mt-2 text-sm">Money summary: {data.unpaidInvoices.length} unpaid ({money(data.unpaidInvoices.reduce((s,i)=>s+getAmount(i),0))}), {data.overdueInvoices.length} overdue ({money(data.overdueInvoices.reduce((s,i)=>s+getAmount(i),0))}).</p><p className="text-sm">Job summary: {jobs.length} total, {data.unassignedJobs.length} unassigned, {data.pausedJobs.length} paused/stuck, {data.completedNotInvoiced.length} completed not invoiced.</p><p className="text-sm">Quote summary: {data.openQuotes.length} pending/open.</p><p className="text-sm">Team summary: {workers.length} workers.</p></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black"><Bot className="inline h-5 w-5"/> Ask Churvox</h2>
          <p className="mt-2 text-sm text-slate-700">Ask Churvox can explain and draft. It does not change records without your approval.</p>
          <form onSubmit={handleAsk} className="mt-3 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={askQuestion} onChange={(e)=>setAskQuestion(e.target.value)} placeholder="Ask who owes money, what needs action, or what should I do next…" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400" />
              <button type="submit" disabled={askLoading || !askQuestion.trim()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{askLoading ? "Asking..." : "Ask"}</button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Who owes money?", "What should I do today?", "What jobs need action?", "What quotes need follow-up?"].map((q)=><button key={q} type="button" onClick={()=>setAskQuestion(q)} className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50">{q}</button>)}
            </div>
          </form>
          {askResult && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-900">{askResult.answer}</p><p className="mt-2 text-xs font-semibold text-slate-600">{askResult.usedAI ? "— Real AI" : "— Smart fallback"}</p>{!askResult.usedAI && askResult.reason && <p className="mt-1 text-xs text-slate-500">{askResult.reason}</p>}</div>}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Briefcase className="inline h-5 w-5"/> AI Action Queue</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{actionQueue.map((a)=><div key={a[0]} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-black">{a[1]}</h3><p className="text-sm">{a[2]} items. {a[3]}</p><p className="text-xs">Priority: {a[4]} • Confidence: {a[5]}</p><Link to={a[6]} className="text-blue-700 font-black">Open →</Link></div>)}</div></section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Bot className="inline h-5 w-5"/> AI Draft Centre</h2><p className="text-sm">AI drafts only. Nothing is sent without your approval.</p>{actionQueue.slice(0,4).map((a,idx)=>{const text=`Draft ${a[1]}: ${a[2]} items need review. Please confirm next steps.`; const id=`d-${idx}`; return <div key={id} className="mt-3 rounded-xl border p-3"><p className="text-xs font-black">Draft type: {a[1]}</p><p className="text-sm">{text}</p><button type="button" onClick={()=>handleCopy(id,text)} className="mt-2 rounded border px-2 py-1 text-xs">Copy</button>{copiedDraftId===id && <span className="ml-2 text-xs text-emerald-700">Draft copied. Review before sending.</span>}</div>;})}</section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Sparkles className="inline h-5 w-5"/> AI Automation Suggestions</h2><p className="text-sm">Open Automation only. No rules are created automatically.</p><Link to="/automation" className="text-blue-700 font-black">Open Automation →</Link></section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Users className="inline h-5 w-5"/> AI Team & Payroll Watchtower</h2><p className="text-sm">Workers: {workers.length}. Missing role: {data.workerMissingRole.length}. Missing region: {data.workerMissingRegion.length}. Missing rate: {data.workerMissingRate.length}. Missing phone/email: {data.workerMissingContact.length}.</p><p className="text-sm">AI highlights team and payroll risks. It does not approve payroll, change rates, edit timesheets, or pay workers.</p><div className="flex gap-3"><Link to="/team">/team</Link><Link to="/timesheets">/timesheets</Link><Link to="/jobs">/jobs</Link></div></section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Receipt className="inline h-5 w-5"/> Safe AI Financial Radar</h2><p className="text-sm">AI highlights cash and revenue risks. It does not mark invoices paid, change prices, or sync MYOB.</p><p className="text-sm">Unpaid invoices: {data.unpaidInvoices.length} / {money(data.unpaidInvoices.reduce((s,i)=>s+getAmount(i),0))}. Overdue invoices: {data.overdueInvoices.length} / {money(data.overdueInvoices.reduce((s,i)=>s+getAmount(i),0))}. Open quotes: {data.openQuotes.length} / {money(data.openQuotes.reduce((s,i)=>s+getAmount(i),0))}. Completed-not-invoiced jobs: {data.completedNotInvoiced.length}. Revenue signal (cash waiting): {money(data.unpaidInvoices.reduce((s,i)=>s+getAmount(i),0)+data.openQuotes.reduce((s,i)=>s+getAmount(i),0))}.</p><div className="flex gap-3"><Link to="/invoices">Open invoice</Link><Link to="/quotes">Open quote</Link><Link to="/jobs">Open job</Link></div></section>

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><h2 className="font-black text-emerald-900"><ShieldCheck className="inline h-5 w-5"/>AI Guardrails</h2><p className="text-sm text-emerald-800">AI suggests. You approve. Nothing is changed automatically.</p></section>
      </div>
    </Layout>
  );
}
