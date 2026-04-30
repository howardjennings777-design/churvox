import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Briefcase, FileText, Receipt, ShieldCheck, Sparkles, Users } from "lucide-react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";

const safeArray = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of keys) if (Array.isArray(value[key])) return value[key];
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.items)) return value.items;
  return [];
};
const safeText = (value, fallback = "") => (value === null || value === undefined ? fallback : String(value).trim() || fallback);
const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const normalize = (value) => safeText(value).toLowerCase();
const status = (item) => normalize(item?.status || item?.payment_status || item?.state || "unknown");
const idOf = (item) => safeText(item?.id || item?._id || item?.job_id || item?.quote_id || item?.invoice_id || "");
const nameOf = (item) => safeText(item?.customer_name || item?.client_name || item?.name || item?.full_name || item?.title || item?.job_title || "Unknown");
const amount = (item) => safeNumber(item?.total || item?.amount || item?.total_amount || item?.grand_total || item?.balance_due || item?.value || item?.estimate || 0);
const money = (value) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(safeNumber(value));
const parseDate = (value) => {
  const raw = safeText(value);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

export default function SafeAIAssistantPage() {
  const { get, post } = useApi();
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [clients, setClients] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [askQuestion, setAskQuestion] = useState("");
  const [askResult, setAskResult] = useState(null);
  const [askLoading, setAskLoading] = useState(false);
  const [copiedDraftId, setCopiedDraftId] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const results = await Promise.allSettled([get("/jobs"), get("/quotes"), get("/invoices"), get("/team/workers"), get("/timesheets"), get("/clients")]);
      if (!mounted) return;
      const nextWarnings = [];
      const [jr, qr, ir, wr, tr, cr] = results;
      const pull = (r, label, keys) => {
        if (r.status !== "fulfilled" || !r.value?.success) {
          nextWarnings.push(`${label} not loaded.`);
          return [];
        }
        return safeArray(r.value?.data, keys);
      };
      setJobs(pull(jr, "Jobs", ["jobs", "items", "data"]));
      setQuotes(pull(qr, "Quotes", ["quotes", "items", "data"]));
      setInvoices(pull(ir, "Invoices", ["invoices", "items", "data"]));
      setWorkers(pull(wr, "Team", ["workers", "items", "data"]));
      setTimesheets(pull(tr, "Timesheets", ["timesheets", "items", "data"]));
      setClients(pull(cr, "Clients", ["clients", "items", "data"]));
      setWarnings(nextWarnings);
    })();
    return () => { mounted = false; };
  }, [get]);

  const model = useMemo(() => {
    const now = new Date();
    const openJobs = safeArray(jobs).filter((j) => !["done", "closed", "completed"].includes(status(j)));
    const pausedJobs = safeArray(jobs).filter((j) => ["paused", "stuck", "on hold", "blocked"].includes(status(j)));
    const unassignedJobs = safeArray(jobs).filter((j) => !safeText(j?.assigned_worker_id || j?.worker_id || j?.assigned_to || j?.assigned_worker_name || j?.worker_name));
    const completedNotInvoiced = safeArray(jobs).filter((j) => status(j) === "completed" && !safeText(j?.invoice_id || j?.invoice_number) && !j?.is_invoiced);
    const overdueJobs = openJobs.filter((j) => { const d = parseDate(j?.due_date || j?.target_date || j?.scheduled_date); return d && d < now; });
    const openQuotes = safeArray(quotes).filter((q) => ["open", "pending", "sent", "draft"].includes(status(q)));
    const unpaidInvoices = safeArray(invoices).filter((inv) => status(inv) !== "paid" && !inv?.paid_at && !inv?.date_paid && !inv?.is_paid);
    const overdueInvoices = unpaidInvoices.filter((inv) => { const d = parseDate(inv?.due_date || inv?.dueDate); return d && d < now; });
    const missingSetup = safeArray(workers).filter((w) => !safeText(w?.role || w?.position) || !safeText(w?.region || w?.location) || !safeNumber(w?.rate || w?.hourly_rate || w?.pay_rate));
    const missingContactClients = safeArray(clients).filter((c) => !safeText(c?.phone) || !safeText(c?.email));
    const debtorMap = unpaidInvoices.reduce((acc, inv) => { const key = nameOf(inv); acc[key] = (acc[key] || 0) + amount(inv); return acc; }, {});
    const topDebtors = Object.entries(debtorMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { openJobs, pausedJobs, unassignedJobs, completedNotInvoiced, overdueJobs, openQuotes, unpaidInvoices, overdueInvoices, missingSetup, missingContactClients, topDebtors };
  }, [jobs, quotes, invoices, workers, clients]);

  const riskLevel = model.overdueInvoices.length || model.unassignedJobs.length || model.completedNotInvoiced.length || model.pausedJobs.length || model.missingSetup.length ? "high" : (model.openJobs.length || model.openQuotes.length || model.unpaidInvoices.length ? "medium" : "low");

  const localFallback = (question) => {
    const q = normalize(question);
    if (q.includes("money") || q.includes("owe") || q.includes("invoice")) return `Unpaid: ${model.unpaidInvoices.length}, overdue: ${model.overdueInvoices.length}, cash waiting: ${money(model.unpaidInvoices.reduce((s, i) => s + amount(i), 0))}.`;
    if (q.includes("job")) return `Jobs needing action: ${model.unassignedJobs.length} unassigned, ${model.pausedJobs.length} paused/stuck, ${model.completedNotInvoiced.length} completed-not-invoiced.`;
    if (q.includes("quote")) return `Open/pending quotes needing follow-up: ${model.openQuotes.length}.`;
    if (q.includes("automate")) return `Automation suggestions: quote follow-ups (${model.openQuotes.length}), invoice reminders (${model.overdueInvoices.length}), assignment alerts (${model.unassignedJobs.length}).`;
    return `Top priority: resolve ${model.overdueInvoices.length} overdue invoices and ${model.unassignedJobs.length} unassigned jobs first.`;
  };

  const ask = async (e) => {
    e.preventDefault();
    const question = safeText(askQuestion);
    if (!question) return;
    setAskLoading(true);
    try {
      const res = await post("/api/ai/ask", { question });
      const payload = res?.data?.data || res?.data || {};
      setAskResult({ answer: safeText(payload.answer || payload.message, localFallback(question)), usedAI: Boolean(payload.used_ai), reason: safeText(payload.reason || payload.fallback_reason) });
    } catch {
      setAskResult({ answer: localFallback(question), usedAI: false, reason: "Smart fallback used." });
    } finally {
      setAskLoading(false);
    }
  };

  const actionQueue = [
    { key: "u", title: "Unassigned jobs", description: `${model.unassignedJobs.length} jobs need assignment.`, reason: "Scheduling risk", priority: "high", confidence: "high", link: "/jobs" },
    { key: "c", title: "Completed jobs not invoiced", description: `${model.completedNotInvoiced.length} jobs ready for billing review.`, reason: "Revenue delay risk", priority: "high", confidence: "high", link: "/jobs" },
    { key: "o", title: "Overdue invoices", description: `${model.overdueInvoices.length} invoices need chasing.`, reason: "Cash risk", priority: "high", confidence: "high", link: "/invoices" },
    { key: "q", title: "Open quotes", description: `${model.openQuotes.length} quotes need follow-up.`, reason: "Conversion opportunity", priority: "medium", confidence: "medium", link: "/quotes" },
    { key: "w", title: "Missing worker setup", description: `${model.missingSetup.length} workers have setup gaps.`, reason: "Team readiness risk", priority: "medium", confidence: "medium", link: "/team" },
  ].filter((a) => /\d+/.test(a.description) && Number(a.description.match(/\d+/)?.[0]) > 0);

  const drafts = [
    model.overdueInvoices[0] && { key: "d1", type: "Invoice reminder", related: nameOf(model.overdueInvoices[0]), text: `Hi ${nameOf(model.overdueInvoices[0])}, this is a friendly reminder that invoice ${safeText(model.overdueInvoices[0]?.invoice_number, idOf(model.overdueInvoices[0]))} is now overdue. Please confirm payment timing.` },
    model.openQuotes[0] && { key: "d2", type: "Quote follow-up", related: nameOf(model.openQuotes[0]), text: `Hi ${nameOf(model.openQuotes[0])}, just checking in on quote ${safeText(model.openQuotes[0]?.quote_number, idOf(model.openQuotes[0]))}. Happy to help with any questions.` },
    model.unassignedJobs[0] && { key: "d3", type: "Worker instruction", related: nameOf(model.unassignedJobs[0]), text: `Team, please review and assign ${nameOf(model.unassignedJobs[0])}. Confirm worker and ETA once allocated.` },
    model.completedNotInvoiced[0] && { key: "d4", type: "Customer completion", related: nameOf(model.completedNotInvoiced[0]), text: `Hi ${nameOf(model.completedNotInvoiced[0])}, your job is complete. We are finalising documentation and will share next steps shortly.` },
    model.missingContactClients[0] && { key: "d5", type: "Client details request", related: nameOf(model.missingContactClients[0]), text: `Hi ${nameOf(model.missingContactClients[0])}, please confirm your best phone and email so we can keep your records up to date.` },
  ].filter(Boolean);

  return <Layout><div className="cx-page space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-blue-50 to-slate-50 p-6 shadow-sm"><h1 className="text-3xl font-black text-slate-900">AI Business Assistant</h1><p className="text-sm text-slate-700">AI suggests. You approve. Nothing is changed automatically.</p></section>
    {warnings.length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{warnings.join(" ")}</section>}
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Bot className="mr-1 inline h-5 w-5" />Ask Churvox</h2><p className="text-sm text-slate-700">Ask Churvox can explain and draft. It does not change records without your approval.</p><form className="mt-3 space-y-2" onSubmit={ask}><input value={askQuestion} onChange={(e) => setAskQuestion(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Ask a question" /><button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" disabled={askLoading}>{askLoading ? "Asking..." : "Ask"}</button><div className="flex flex-wrap gap-2 text-xs">{["Who owes money?", "What should I do today?", "What jobs need action?", "What quotes need follow-up?", "What invoices need chasing?", "What should I automate?"].map((q) => <button key={q} type="button" className="rounded-full border border-slate-300 px-3 py-1" onClick={() => setAskQuestion(q)}>{q}</button>)}</div></form>{askResult && <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><p className="text-sm">{askResult.answer}</p><p className="text-xs text-slate-600">{askResult.usedAI ? "— Real AI" : "— Smart fallback"}</p>{askResult.reason && <p className="text-xs text-slate-500">{askResult.reason}</p>}</div>}</section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Sparkles className="mr-1 inline h-5 w-5" />AI Daily Brief</h2><p className="text-sm">Risk level: {riskLevel}</p><p className="text-sm">Money summary: cash waiting {money(model.unpaidInvoices.reduce((s, i) => s + amount(i), 0))}.</p><p className="text-sm">Job summary: {model.openJobs.length} open, {model.unassignedJobs.length} unassigned, {model.pausedJobs.length} paused/stuck.</p><p className="text-sm">Quote summary: {model.openQuotes.length} open.</p><p className="text-sm">Invoice summary: {model.unpaidInvoices.length} unpaid, {model.overdueInvoices.length} overdue.</p><p className="text-sm">Team summary: {workers.length} workers, {model.missingSetup.length} setup issues.</p></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Briefcase className="mr-1 inline h-5 w-5" />AI Action Queue</h2>{actionQueue.length === 0 ? <p className="text-sm">No urgent actions found.</p> : <div className="grid gap-3 md:grid-cols-2">{actionQueue.map((a) => <div key={a.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="font-bold">{a.title}</p><p className="text-xs">{a.description}</p><p className="text-xs">Reason: {a.reason}</p><p className="text-xs">Priority: {a.priority} • Confidence: {a.confidence}</p><Link to={a.link} className="text-sm font-bold text-blue-700">Open</Link></div>)}</div>}</section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><FileText className="mr-1 inline h-5 w-5" />AI Draft Centre</h2><p className="text-sm">AI drafts only. Nothing is sent without your approval.</p>{drafts.length === 0 ? <p className="text-sm">No drafts available yet.</p> : drafts.map((d) => <div key={d.key} className="mt-2 rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold">{d.type}</p><p className="text-xs text-slate-500">Related: {d.related}</p><p className="text-sm">{d.text}</p><button type="button" className="mt-2 rounded border px-2 py-1 text-xs" onClick={async () => { try { await navigator.clipboard.writeText(d.text); setCopiedDraftId(d.key); setTimeout(() => setCopiedDraftId(""), 2500); } catch { setCopiedDraftId(""); } }}>Copy</button>{copiedDraftId === d.key && <span className="ml-2 text-xs text-emerald-700">Draft copied. Review before sending.</span>}</div>)}</section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Users className="mr-1 inline h-5 w-5" />AI Team & Payroll Watchtower</h2><p className="text-sm">AI highlights team and payroll risks. It does not approve payroll, change rates, edit timesheets, or pay workers.</p><p className="text-sm">Workers: {workers.length}. Missing setup: {model.missingSetup.length}.</p><p className="text-sm">Timesheet review: {timesheets.length ? `${timesheets.length} loaded.` : "No team/payroll risks found."}</p><div className="flex gap-3 text-sm"><Link to="/team" className="font-bold text-blue-700">Open Team</Link><Link to="/timesheets" className="font-bold text-blue-700">Open Timesheets</Link><Link to="/jobs" className="font-bold text-blue-700">Open Jobs</Link></div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Receipt className="mr-1 inline h-5 w-5" />Safe AI Financial Radar</h2><p className="text-sm">Cash waiting: {money(model.unpaidInvoices.reduce((s, i) => s + amount(i), 0))}</p><p className="text-sm">Revenue signal: {money(model.openQuotes.reduce((s, q) => s + amount(q), 0))}</p><p className="text-sm">Revenue at risk: {money(model.overdueInvoices.reduce((s, i) => s + amount(i), 0) + model.completedNotInvoiced.reduce((s, j) => s + amount(j), 0))}</p><p className="text-sm">Top debtors: {model.topDebtors.length ? model.topDebtors.map(([n, v]) => `${n} (${money(v)})`).join(", ") : "No financial risks found."}</p><div className="flex gap-3 text-sm"><Link to="/invoices" className="font-bold text-blue-700">Open Invoice</Link><Link to="/quotes" className="font-bold text-blue-700">Open Quote</Link><Link to="/jobs" className="font-bold text-blue-700">Open Job</Link></div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><Sparkles className="mr-1 inline h-5 w-5" />Business Memory Lite</h2><p className="text-sm">Business Memory Lite uses current loaded data only. It does not store or change anything.</p><p className="text-sm">Pattern: unpaid debtor clusters {model.topDebtors.length}.</p><p className="text-sm">Pattern: open quotes {model.openQuotes.length}, unassigned jobs {model.unassignedJobs.length}, completed-not-invoiced {model.completedNotInvoiced.length}.</p></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black"><ShieldCheck className="mr-1 inline h-5 w-5" />Launch Readiness</h2><p className="text-sm">Jobs loading: {jobs.length ? "Ready" : "Not loaded"}</p><p className="text-sm">Quotes loading: {quotes.length ? "Ready" : "Not loaded"}</p><p className="text-sm">Invoices loading: {invoices.length ? "Ready" : "Not loaded"}</p><p className="text-sm">Team loading: {workers.length ? "Ready" : "Not loaded"}</p><p className="text-sm">Ask Churvox available: Ready</p><p className="text-sm">AI safety guardrails visible: Ready</p><p className="text-sm">No automatic send/payroll/MYOB actions: Ready</p></section>
  </div></Layout>;
}
