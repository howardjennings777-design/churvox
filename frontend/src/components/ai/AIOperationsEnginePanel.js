import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useApi } from "../../hooks/useApi";

const list = (value) => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : Array.isArray(value?.data) ? value.data : Array.isArray(value?.jobs) ? value.jobs : Array.isArray(value?.quotes) ? value.quotes : Array.isArray(value?.invoices) ? value.invoices : Array.isArray(value?.workers) ? value.workers : [];
const s = (value) => String(value || "").toLowerCase().trim();
const cash = (value) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(value || 0));
const amount = (item) => Number(item?.balance_due || item?.amount_due || item?.total || item?.amount || item?.price || item?.subtotal || 0) || 0;
const rid = (item) => item?.id || item?._id || item?.job_id || item?.quote_id || item?.invoice_id || "";
const isPast = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
};

export default function AIOperationsEnginePanel() {
  const { get } = useApi();
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState(null);
  const [actions, setActions] = useState([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [jobsRes, quotesRes, invoicesRes, workersRes] = await Promise.allSettled([
      get("/jobs"), get("/quotes"), get("/invoices"), get("/team/workers"),
    ]);
    const jobs = jobsRes.status === "fulfilled" && jobsRes.value?.success ? list(jobsRes.value.data) : [];
    const quotes = quotesRes.status === "fulfilled" && quotesRes.value?.success ? list(quotesRes.value.data) : [];
    const invoices = invoicesRes.status === "fulfilled" && invoicesRes.value?.success ? list(invoicesRes.value.data) : [];
    const workers = workersRes.status === "fulfilled" && workersRes.value?.success ? list(workersRes.value.data) : [];

    const openJobs = jobs.filter((j) => !["completed", "cancelled"].includes(s(j.status)));
    const unassignedJobs = openJobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !j.assigned_to);
    const completedNoInvoice = jobs.filter((j) => s(j.status) === "completed" && !j.invoice_id && !j.invoice_number);
    const openQuotes = quotes.filter((q) => ["sent", "pending", "draft"].includes(s(q.status)));
    const unpaidInvoices = invoices.filter((i) => ["unpaid", "sent", "partial", "overdue"].includes(s(i.status)));
    const overdueInvoices = unpaidInvoices.filter((i) => s(i.status) === "overdue" || isPast(i.due_date || i.due_at));
    const workerSetup = workers.filter((w) => !w.role || !w.region || (!w.hourly_rate && !w.rate));
    const unpaidValue = unpaidInvoices.reduce((sum, item) => sum + amount(item), 0);
    const quoteValue = openQuotes.reduce((sum, item) => sum + amount(item), 0);
    const risk = Math.min(100, overdueInvoices.length * 16 + unassignedJobs.length * 9 + completedNoInvoice.length * 8 + openQuotes.length * 4 + workerSetup.length * 5);

    const next = [];
    if (overdueInvoices.length) next.push({ id: "invoice-risk", title: `Review ${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"}`, reason: `${cash(unpaidValue)} is unpaid across invoices.`, to: "/invoices", risk: "high" });
    if (unassignedJobs.length) next.push({ id: "assign-jobs", title: `Assign ${unassignedJobs.length} open job${unassignedJobs.length === 1 ? "" : "s"}`, reason: "Open work needs a responsible worker.", to: rid(unassignedJobs[0]) ? `/jobs/${rid(unassignedJobs[0])}` : "/jobs", risk: "high" });
    if (completedNoInvoice.length) next.push({ id: "invoice-jobs", title: `Draft invoices for ${completedNoInvoice.length} completed job${completedNoInvoice.length === 1 ? "" : "s"}`, reason: "Completed work should become draft invoices quickly.", to: "/jobs", risk: "medium" });
    if (openQuotes.length) next.push({ id: "follow-quotes", title: `Follow up ${openQuotes.length} open quote${openQuotes.length === 1 ? "" : "s"}`, reason: `${cash(quoteValue)} in quote value is waiting for action.`, to: "/quotes", risk: "medium" });
    if (workerSetup.length) next.push({ id: "team-setup", title: `Fix ${workerSetup.length} worker setup issue${workerSetup.length === 1 ? "" : "s"}`, reason: "Missing role, region or rate weakens scheduling and payroll checks.", to: "/team", risk: "medium" });
    if (!next.length) next.push({ id: "clear", title: "No urgent AI action found", reason: "Business data looks controlled. Review automations and follow-ups next.", to: "/automation", risk: "low" });

    setSnapshot({ jobs, quotes, invoices, workers, openJobs, unassignedJobs, completedNoInvoice, openQuotes, unpaidInvoices, overdueInvoices, workerSetup, unpaidValue, quoteValue, risk, health: Math.max(0, 100 - risk) });
    setActions(next.slice(0, 6));
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const ask = () => {
    if (!snapshot) return;
    const q = s(question);
    if (q.includes("invoice") || q.includes("unpaid") || q.includes("cash")) setAnswer(`${snapshot.unpaidInvoices.length} invoices need payment attention, worth ${cash(snapshot.unpaidValue)}.`);
    else if (q.includes("quote")) setAnswer(`${snapshot.openQuotes.length} quotes are open, worth ${cash(snapshot.quoteValue)}.`);
    else if (q.includes("job")) setAnswer(`${snapshot.openJobs.length} jobs are open. ${snapshot.unassignedJobs.length} need assignment. ${snapshot.completedNoInvoice.length} completed jobs may need invoices.`);
    else if (q.includes("team") || q.includes("worker")) setAnswer(`${snapshot.workers.length} workers loaded. ${snapshot.workerSetup.length} may need setup fixes.`);
    else setAnswer(actions[0]?.title || "No urgent AI action found.");
  };

  if (loading) return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin text-blue-600" />Building AI Operations Engine...</section>;
  if (!snapshot) return null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="ai-operations-engine-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700"><Bot className="h-4 w-4" />AI Operations Engine</p>
          <h2 className="mt-3 text-2xl font-black text-slate-950">Business brain + action queue</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">Live business snapshot, ranked next actions, and approval-first AI guidance.</p>
        </div>
        <button onClick={load} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"><RefreshCw className="mr-1 inline h-3.5 w-3.5" />Refresh</button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-white to-emerald-50 p-4 shadow-sm"><p className="text-xs font-black text-slate-950">HEALTH</p><p className="text-3xl font-black text-emerald-800">{snapshot.health}</p></div>
        <div className="rounded-2xl border border-red-200 bg-gradient-to-b from-white to-red-50 p-4 shadow-sm"><p className="text-xs font-black text-slate-950">RISK</p><p className="text-3xl font-black text-red-800">{snapshot.risk}</p></div>
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-white to-blue-50 p-4 shadow-sm"><p className="text-xs font-black text-slate-950">UNPAID</p><p className="text-3xl font-black text-blue-800">{cash(snapshot.unpaidValue)}</p></div>
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-white to-amber-50 p-4 shadow-sm"><p className="text-xs font-black text-slate-950">ACTIONS</p><p className="text-3xl font-black text-amber-800">{actions.length}</p></div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950"><Sparkles className="h-4 w-4 text-blue-600" />AI action queue</p>
          <div className="space-y-2">
            {actions.map((action) => (
              <div key={action.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">{action.title}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">{action.reason}</p>
                  </div>
                  <Link to={action.to} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white">Open</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-black text-slate-950">Ask Churvox</p>
          <div className="mt-3 flex gap-2"><input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="What should I do next?" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button onClick={ask} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white">Ask</button></div>
          <div className="mt-3 min-h-[76px] rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">{answer || "Try asking about jobs, quotes, invoices, team, cash or next action."}</div>
          <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />AI suggests. Owners/admins still approve sensitive actions.</p>
        </div>
      </div>
    </section>
  );
}
