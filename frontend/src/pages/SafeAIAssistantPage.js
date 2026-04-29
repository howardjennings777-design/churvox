import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { Bot, Briefcase, FileText, Receipt, ShieldCheck, Sparkles, Users } from "lucide-react";

const normalize = (value) => String(value || "").trim().toLowerCase();
const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const extractList = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  const matchedKey = keys.find((key) => Array.isArray(data?.[key]));
  return matchedKey ? data[matchedKey] : [];
};
const getItemId = (item) => String(item?.id || item?._id || item?.invoice_id || item?.quote_id || item?.job_id || "");
const getCustomer = (item) => item?.customer_name || item?.client_name || item?.customer?.name || item?.client?.name || "Customer";
const getTitle = (job) => job?.title || job?.job_title || job?.name || "Job";
const getAmount = (item) => toNumber(item?.total || item?.amount || item?.total_amount || item?.grand_total || item?.balance_due || 0);
const getDueDate = (item) => {
  const date = new Date(item?.due_date || item?.dueDate || item?.target_date || item?.targetDate || "");
  return Number.isNaN(date.getTime()) ? null : date;
};
const assigned = (job) => Boolean(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || job?.assigned_worker_name || job?.worker_name);
const isQuoteOpen = (quote) => ["pending", "open", "sent", "draft"].includes(normalize(quote?.status));
const isInvoicePaid = (inv) => {
  const status = normalize(inv?.status || inv?.payment_status);
  return Boolean(inv?.paid_at || inv?.date_paid || inv?.is_paid || status === "paid");
};
const money = (value) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);

export default function SafeAIAssistantPage() {
  const { get, post } = useApi();
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [timesheetsAvailable, setTimesheetsAvailable] = useState(false);
  const [copiedDraftId, setCopiedDraftId] = useState("");
  const [askQuestion, setAskQuestion] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askResult, setAskResult] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [jr, qr, ir, wr, tr] = await Promise.allSettled([get("/jobs"), get("/quotes"), get("/invoices"), get("/team/workers"), get("/timesheets")]);
      if (!active) return;
      if (jr.status === "fulfilled" && jr.value?.success) setJobs(extractList(jr.value.data, ["jobs", "items", "data"]));
      if (qr.status === "fulfilled" && qr.value?.success) setQuotes(extractList(qr.value.data, ["quotes", "items", "data"]));
      if (ir.status === "fulfilled" && ir.value?.success) setInvoices(extractList(ir.value.data, ["invoices", "items", "data"]));
      if (wr.status === "fulfilled" && wr.value?.success) setWorkers(extractList(wr.value.data, ["workers", "items", "data"]));
      if (tr.status === "fulfilled" && tr.value?.success) {
        setTimesheets(extractList(tr.value.data, ["timesheets", "items", "data"]));
        setTimesheetsAvailable(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [get]);

  const data = useMemo(() => {
    const now = new Date();
    const unpaidInvoices = invoices.filter((invoice) => !isInvoicePaid(invoice));
    const overdueInvoices = unpaidInvoices.filter((invoice) => {
      const due = getDueDate(invoice);
      return due && due < now;
    });
    const unassignedJobs = jobs.filter((job) => !assigned(job));
    const pausedJobs = jobs.filter((job) => ["paused", "stuck", "on hold", "on-hold", "blocked"].includes(normalize(job?.status)));
    const completedNotInvoiced = jobs.filter((job) => normalize(job?.status) === "completed" && !Boolean(job?.invoice_id || job?.invoice_number || job?.is_invoiced));
    const overdueJobs = jobs.filter((job) => {
      const due = getDueDate(job);
      return due && due < now && !["completed", "done", "closed"].includes(normalize(job?.status));
    });
    const openQuotes = quotes.filter(isQuoteOpen);
    const workerMissingRole = workers.filter((worker) => !String(worker?.role || worker?.position || "").trim());
    const workerMissingRegion = workers.filter((worker) => !String(worker?.region || worker?.area || worker?.location || "").trim());
    const workerMissingRate = workers.filter((worker) => [worker?.rate, worker?.hourly_rate, worker?.pay_rate].every((value) => !toNumber(value)));
    const workerMissingContact = workers.filter((worker) => !String(worker?.phone || worker?.mobile || "").trim() || !String(worker?.email || "").trim());
    const activeWorkers = workers.filter((worker) => !["inactive", "archived"].includes(normalize(worker?.status)));

    const jobsByWorker = jobs.reduce((acc, job) => {
      const workerId = String(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || "");
      if (!workerId) return acc;
      acc[workerId] = (acc[workerId] || 0) + 1;
      return acc;
    }, {});

    const workerLoad = workers.map((worker) => ({
      worker,
      count: jobsByWorker[String(worker?.id || worker?._id || "")] || 0,
    })).sort((a, b) => b.count - a.count);

    const topDebtors = unpaidInvoices
      .reduce((acc, invoice) => {
        const key = getCustomer(invoice);
        acc[key] = (acc[key] || 0) + getAmount(invoice);
        return acc;
      }, {})
;

    return {
      unpaidInvoices,
      overdueInvoices,
      unassignedJobs,
      pausedJobs,
      completedNotInvoiced,
      overdueJobs,
      openQuotes,
      workerMissingRole,
      workerMissingRegion,
      workerMissingRate,
      workerMissingContact,
      activeWorkers,
      workerLoad,
      topDebtors: Object.entries(topDebtors).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [invoices, jobs, quotes, workers]);

  const riskLevel = data.overdueInvoices.length || data.unassignedJobs.length || data.completedNotInvoiced.length || data.pausedJobs.length || data.workerMissingRole.length
    ? "high"
    : (jobs.length || data.openQuotes.length || data.unpaidInvoices.length || data.workerMissingContact.length ? "medium" : "low");

  const priorityClasses = { high: "border-red-200 bg-red-50 text-red-700", medium: "border-amber-200 bg-amber-50 text-amber-700", low: "border-blue-200 bg-blue-50 text-blue-700" };

  const buildLocalFallback = (question) => {
    const q = normalize(question);
    if (!q) return "Ask about jobs, quotes, invoices, or automation opportunities.";
    if (q.includes("owe") || q.includes("money") || q.includes("invoice")) {
      return `Unpaid invoices: ${data.unpaidInvoices.length}. Overdue invoices: ${data.overdueInvoices.length}. Cash waiting: ${money(data.unpaidInvoices.reduce((sum, item) => sum + getAmount(item), 0))}.`;
    }
    if (q.includes("quote")) return `Quotes needing follow-up: ${data.openQuotes.length}.`;
    if (q.includes("automate")) return `Automation opportunities: ${data.openQuotes.length} quote follow-ups, ${data.overdueInvoices.length} overdue invoice reminders, ${data.unassignedJobs.length} assignment alerts.`;
    if (q.includes("job")) return `Jobs needing action: ${data.unassignedJobs.length} unassigned, ${data.pausedJobs.length} paused/stuck, ${data.completedNotInvoiced.length} completed not invoiced.`;
    return `Priority snapshot: ${data.overdueInvoices.length} overdue invoices, ${data.unassignedJobs.length} unassigned jobs, ${data.openQuotes.length} open quotes.`;
  };

  const handleAsk = async (event) => {
    event.preventDefault();
    const question = askQuestion.trim();
    if (!question) return;
    setAskLoading(true);
    try {
      const response = await post("/api/ai/ask", { question });
      if (response?.success) {
        const payload = response.data?.data || response.data || {};
        setAskResult({
          answer: payload.answer || payload.message || buildLocalFallback(question),
          usedAI: Boolean(payload.used_ai),
          reason: payload.reason || payload.fallback_reason || "",
        });
      } else {
        setAskResult({ answer: buildLocalFallback(question), usedAI: false, reason: response?.error || "AI unavailable" });
      }
    } catch {
      setAskResult({ answer: buildLocalFallback(question), usedAI: false, reason: "AI endpoint unavailable" });
    } finally {
      setAskLoading(false);
    }
  };

  const actionQueue = [
    { key: "unassigned", title: "Unassigned jobs", count: data.unassignedJobs.length, reason: "Jobs have no worker assigned.", priority: "high", confidence: "high", link: "/jobs" },
    { key: "completed", title: "Completed jobs not invoiced", count: data.completedNotInvoiced.length, reason: "Revenue could be delayed.", priority: "high", confidence: "high", link: "/jobs" },
    { key: "unpaid", title: "Unpaid invoices", count: data.unpaidInvoices.length, reason: "Cash waiting to be collected.", priority: "medium", confidence: "high", link: "/invoices" },
    { key: "overdue", title: "Overdue invoices", count: data.overdueInvoices.length, reason: "High cash collection risk.", priority: "high", confidence: "high", link: "/invoices" },
    { key: "quotes", title: "Pending/open quotes", count: data.openQuotes.length, reason: "Follow-up can lift conversion.", priority: "medium", confidence: "medium", link: "/quotes" },
    { key: "setup", title: "Missing worker setup", count: data.workerMissingRole.length + data.workerMissingRegion.length + data.workerMissingRate.length, reason: "Team setup gaps may affect operations.", priority: "medium", confidence: "medium", link: "/team" },
    { key: "paused", title: "Paused/stuck jobs", count: data.pausedJobs.length, reason: "Delivery risk and customer delay risk.", priority: "high", confidence: "medium", link: "/jobs" },
    { key: "timesheet", title: "Timesheet review warning", count: timesheetsAvailable ? timesheets.filter((sheet) => !sheet?.approved_at && normalize(sheet?.status) !== "approved").length : 0, reason: "Unapproved timesheets may block payroll readiness.", priority: "medium", confidence: "low", link: "/timesheets" },
  ].filter((item) => item.count > 0);

  const draftCards = [
    data.overdueInvoices[0] && { key: "invoice-reminder", type: "Invoice reminder draft", related: getCustomer(data.overdueInvoices[0]), text: `Hi ${getCustomer(data.overdueInvoices[0])}, quick reminder that invoice ${data.overdueInvoices[0]?.invoice_number || getItemId(data.overdueInvoices[0]) || ""} is overdue. Please confirm payment timing.` },
    data.openQuotes[0] && { key: "quote-follow-up", type: "Quote follow-up draft", related: getCustomer(data.openQuotes[0]), text: `Hi ${getCustomer(data.openQuotes[0])}, checking in on quote ${data.openQuotes[0]?.quote_number || getItemId(data.openQuotes[0]) || ""}. Happy to answer questions or adjust scope.` },
    (data.overdueJobs[0] || data.pausedJobs[0] || data.unassignedJobs[0]) && { key: "job-update", type: "Customer job update draft", related: getCustomer(data.overdueJobs[0] || data.pausedJobs[0] || data.unassignedJobs[0]), text: `Hi ${getCustomer(data.overdueJobs[0] || data.pausedJobs[0] || data.unassignedJobs[0])}, your job is under active review and we are scheduling the next update now.` },
    data.unassignedJobs[0] && { key: "worker-instruction", type: "Worker instruction draft", related: getTitle(data.unassignedJobs[0]), text: `Team update: ${getTitle(data.unassignedJobs[0])} needs assignment. Please review availability, allocate a worker, and confirm ETA.` },
    data.completedNotInvoiced[0] && { key: "thank-you", type: "Thank-you / completion draft", related: getCustomer(data.completedNotInvoiced[0]), text: `Hi ${getCustomer(data.completedNotInvoiced[0])}, thank you for choosing us. Your completed job is being finalized and invoice documentation will follow shortly.` },
  ].filter(Boolean);

  return <Layout><div className="cx-page space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-blue-50 to-slate-50 p-6 shadow-sm">
      <h1 className="text-3xl font-black text-slate-950">AI Business Assistant</h1>
      <p className="mt-2 text-sm font-semibold text-slate-600">AI suggests. You approve. Nothing is changed automatically.</p>
      <p className="text-sm font-semibold text-slate-600">AI drafts only. Nothing is sent without your approval.</p>
      <p className="text-sm font-semibold text-slate-600">AI highlights cash and revenue risks. It does not mark invoices paid, change prices, or sync MYOB.</p>
      <p className="text-sm font-semibold text-slate-600">AI highlights team and payroll risks. It does not approve payroll, change rates, edit timesheets, or pay workers.</p>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Bot className="mr-1 inline h-5 w-5" />Ask Churvox</h2><p className="mt-2 text-sm text-slate-700">Ask Churvox can explain and draft. It does not change records without your approval.</p><form onSubmit={handleAsk} className="mt-3 space-y-3"><div className="flex flex-col gap-2 sm:flex-row"><input value={askQuestion} onChange={(event) => setAskQuestion(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Ask Churvox what to focus on today..." /><button type="submit" disabled={askLoading || !askQuestion.trim()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{askLoading ? "Asking..." : "Ask"}</button></div><div className="flex flex-wrap gap-2 text-xs">{["Who owes money?", "What should I do today?", "What jobs need action?", "What quotes need follow-up?", "What invoices need chasing?", "What should I automate?"].map((q) => <button key={q} type="button" onClick={() => setAskQuestion(q)} className="rounded-full border border-slate-300 px-3 py-1">{q}</button>)}</div></form>{askResult && <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm">{askResult.answer}</p><p className="mt-2 text-xs font-semibold text-slate-600">{askResult.usedAI ? "— Real AI" : "— Smart fallback"}</p>{askResult.reason && <p className="mt-1 text-xs text-slate-500">{askResult.reason}</p>}</div>}</section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Sparkles className="mr-1 inline h-5 w-5" />AI Daily Brief</h2><p className="mt-2 text-sm">Headline: {riskLevel === "high" ? "Immediate operational and cash risks need owner attention." : riskLevel === "medium" ? "Stable but active day with follow-ups needed." : "Low risk day with no major blockers detected."}</p><p className="mt-2 text-sm">Risk level: <span className={`rounded-full border px-2 py-1 text-xs ${priorityClasses[riskLevel]}`}>{riskLevel}</span></p><p className="mt-2 text-sm">Today&apos;s focus: collect overdue cash, clear unassigned jobs, and convert open quotes.</p><p className="text-sm">Money summary: cash waiting {money(data.unpaidInvoices.reduce((s, i) => s + getAmount(i), 0))}; revenue at risk {money(data.overdueInvoices.reduce((s, i) => s + getAmount(i), 0) + data.completedNotInvoiced.reduce((s, i) => s + getAmount(i), 0))}.</p><p className="text-sm">Job summary: {jobs.length} jobs, {data.unassignedJobs.length} needs assignment, {data.pausedJobs.length} paused/stuck, {data.completedNotInvoiced.length} completed-not-invoiced.</p><p className="text-sm">Quote summary: {data.openQuotes.length} open/pending quotes.</p><p className="text-sm">Invoice summary: {data.unpaidInvoices.length} unpaid, {data.overdueInvoices.length} overdue.</p><p className="text-sm">Team summary: {workers.length} workers, {data.workerMissingRole.length + data.workerMissingRegion.length + data.workerMissingRate.length} setup issues.</p><p className="text-sm">Recommended actions: review action queue, use draft centre, and open jobs/invoices for manual approval-first actions.</p></section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Briefcase className="mr-1 inline h-5 w-5" />AI Action Queue</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{actionQueue.map((item) => <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-black">{item.title}</h3><p className="text-sm">{item.count} items</p><p className="text-xs text-slate-600">Reason: {item.reason}</p><p className="text-xs">Priority: {item.priority} • Confidence: {item.confidence}</p><Link to={item.link} className="text-sm font-black text-blue-700">Open →</Link></div>)}</div></section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><FileText className="mr-1 inline h-5 w-5" />AI Draft Centre</h2><p className="text-sm">AI drafts only. Nothing is sent without your approval.</p>{draftCards.map((draft) => <div key={draft.key} className="mt-3 rounded-xl border border-slate-200 p-3"><p className="text-xs font-black">{draft.type}</p><p className="text-xs text-slate-500">Related: {draft.related || "General"}</p><p className="mt-1 text-sm">{draft.text}</p><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(draft.text); setCopiedDraftId(draft.key); setTimeout(() => setCopiedDraftId(""), 2500); } catch { setCopiedDraftId(""); } }} className="mt-2 rounded border px-2 py-1 text-xs">Copy</button>{copiedDraftId === draft.key && <span className="ml-2 text-xs text-emerald-700">Draft copied. Review before sending.</span>}</div>)}</section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Sparkles className="mr-1 inline h-5 w-5" />AI Automation Suggestions</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{[
      { key: "q", title: "Quote follow-up task", trigger: "Quote pending/open", suggested: "Create owner follow-up task", reason: "Increase conversion signal", priority: "medium" },
      { key: "i", title: "Invoice reminder draft", trigger: "Invoice overdue/unpaid", suggested: "Prepare reminder draft", reason: "Reduce revenue at risk", priority: "high" },
      { key: "c", title: "Draft invoice task", trigger: "Job completed not invoiced", suggested: "Create invoice prep checklist", reason: "Capture cash waiting", priority: "high" },
      { key: "u", title: "Owner assignment alert", trigger: "Job unassigned", suggested: "Notify owner/manager", reason: "Avoid scheduling delay", priority: "high" },
      { key: "w", title: "Team cleanup task", trigger: "Worker missing setup", suggested: "Fix role/rate/region/contact", reason: "Improve payroll readiness", priority: "medium" },
      { key: "p", title: "Paused job owner alert", trigger: "Job paused/stuck", suggested: "Owner escalation review", reason: "Limit client delay risk", priority: "high" },
    ].map((card) => <div key={card.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-black">{card.title}</h3><p className="text-xs">Trigger: {card.trigger}</p><p className="text-xs">Suggested action: {card.suggested}</p><p className="text-xs">Reason: {card.reason}</p><p className="text-xs">Priority: {card.priority}</p><Link to="/automation" className="text-sm font-black text-blue-700">Open Automation →</Link></div>)}</div></section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Briefcase className="mr-1 inline h-5 w-5" />AI Job Control</h2><div className="space-y-2 text-sm"><p>Needs assignment: {data.unassignedJobs.length}</p><p>Overdue: {data.overdueJobs.length}</p><p>Paused/Stuck: {data.pausedJobs.length}</p><p>Completed not invoiced: {data.completedNotInvoiced.length}</p></div><div className="mt-3 space-y-2">{[...data.unassignedJobs.slice(0, 2), ...data.pausedJobs.slice(0, 2), ...data.completedNotInvoiced.slice(0, 2)].slice(0, 5).map((job, index) => <div key={`${getItemId(job)}-${index}`} className="rounded-xl border border-slate-200 p-3"><p className="font-semibold">{getTitle(job)} / {getCustomer(job)}</p><p className="text-xs">Status: {job?.status || "unknown"} • Reason: needs manual review • Priority: high</p><Link to={getItemId(job) ? `/jobs/${getItemId(job)}` : "/jobs"} className="text-sm font-black text-blue-700">Open job →</Link></div>)}</div><div className="mt-3 flex gap-3 text-sm"><Link to="/jobs" className="font-black text-blue-700">Open jobs</Link><Link to="/schedule" className="font-black text-blue-700">Open schedule</Link></div></section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Users className="mr-1 inline h-5 w-5" />AI Team & Payroll Watchtower</h2><p className="text-sm">Worker setup: {workers.length} workers total, {data.activeWorkers.length} active, {data.workerMissingRole.length} missing role, {data.workerMissingRegion.length} missing region, {data.workerMissingRate.length} missing rate, {data.workerMissingContact.length} missing phone/email.</p><p className="text-sm">Workload: {data.workerLoad.slice(0, 3).map((entry) => `${entry.worker?.name || entry.worker?.full_name || "Worker"} (${entry.count})`).join(", ") || "No worker load data available."}</p><p className="text-sm">Timesheet review: {timesheetsAvailable ? `${timesheets.length} timesheets loaded for review.` : "Timesheet data not loaded in this environment."}</p><p className="text-sm">Payroll readiness: {timesheetsAvailable ? "Review unapproved timesheets before payroll." : "Payroll check is limited until timesheet data is available."}</p><p className="text-sm">Recommended actions: complete worker setup, rebalance workload, and review timesheets manually.</p><div className="flex gap-3 text-sm"><Link to="/team" className="font-black text-blue-700">/team</Link><Link to="/timesheets" className="font-black text-blue-700">/timesheets</Link><Link to="/jobs" className="font-black text-blue-700">/jobs</Link></div></section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Receipt className="mr-1 inline h-5 w-5" />Safe AI Financial Radar</h2><p className="text-sm">Unpaid invoices: {data.unpaidInvoices.length} / {money(data.unpaidInvoices.reduce((sum, item) => sum + getAmount(item), 0))}</p><p className="text-sm">Overdue invoices: {data.overdueInvoices.length} / {money(data.overdueInvoices.reduce((sum, item) => sum + getAmount(item), 0))}</p><p className="text-sm">Open quote count/value: {data.openQuotes.length} / {money(data.openQuotes.reduce((sum, item) => sum + getAmount(item), 0))}</p><p className="text-sm">Completed-not-invoiced count/value: {data.completedNotInvoiced.length} / {money(data.completedNotInvoiced.reduce((sum, item) => sum + getAmount(item), 0))}</p><p className="text-sm">Revenue at risk: {money(data.overdueInvoices.reduce((sum, item) => sum + getAmount(item), 0) + data.completedNotInvoiced.reduce((sum, item) => sum + getAmount(item), 0))}</p><p className="text-sm">Cash waiting: {money(data.unpaidInvoices.reduce((sum, item) => sum + getAmount(item), 0))} • Revenue signal: {money(data.openQuotes.reduce((sum, item) => sum + getAmount(item), 0))}</p><p className="text-sm">Top debtors: {data.topDebtors.map(([name, value]) => `${name} (${money(value)})`).join(", ") || "No debtor concentration found."}</p><p className="text-sm">Quote follow-ups: {data.openQuotes.slice(0, 3).map((quote) => `${getCustomer(quote)} (${quote?.quote_number || getItemId(quote) || "quote"})`).join(", ") || "No immediate follow-ups."}</p><p className="text-sm">Uninvoiced jobs: {data.completedNotInvoiced.slice(0, 3).map((job) => `${getTitle(job)} (${getCustomer(job)})`).join(", ") || "No uninvoiced completed jobs."}</p><div className="flex gap-3 text-sm"><Link to="/invoices" className="font-black text-blue-700">Open invoice</Link><Link to="/quotes" className="font-black text-blue-700">Open quote</Link><Link to="/jobs" className="font-black text-blue-700">Open job</Link></div></section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Sparkles className="mr-1 inline h-5 w-5" />Business Memory Lite</h2><div className="space-y-2 text-sm"><p>{data.topDebtors.length ? `Pattern: ${data.topDebtors[0][0]} appears repeatedly in unpaid invoices.` : "Pattern: no repeated unpaid debtor cluster detected."}</p><p>Pattern: {data.openQuotes.length} quotes are pending/open.</p><p>Pattern: {data.completedNotInvoiced.length} jobs are completed but not invoiced.</p><p>Pattern: {data.unassignedJobs.length} jobs are unassigned.</p><p>Pattern: {data.workerMissingRole.length + data.workerMissingRegion.length + data.workerMissingRate.length} worker setup gaps detected.</p></div></section>

    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><h2 className="font-black text-emerald-900"><ShieldCheck className="mr-1 inline h-5 w-5" />AI Guardrails</h2><p className="text-sm text-emerald-800">AI suggests. You approve. Nothing is changed automatically.</p></section>
  </div></Layout>;
}
