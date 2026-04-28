import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import { AppShell, PageHeader, SectionCard, LoadingState, ErrorState, StatusBadge } from "../components/premium/PremiumUI";
import { AlertTriangle, Bot, Briefcase, CheckCircle2, Copy, FileText, Lightbulb, Receipt, RefreshCw, ShieldCheck, Sparkles, Users } from "lucide-react";

const itemId = (item, fallback) => item?.id || item?._id || fallback;
const status = (value) => String(value || "").trim().toLowerCase();
const toDate = (value) => { const d = value ? new Date(value) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };
const isOverdue = (value) => { const d = toDate(value); if (!d) return false; const now = new Date(); return d < new Date(now.getFullYear(), now.getMonth(), now.getDate()); };
const money = (value) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(value || 0));
const settledData = (result, fallback) => result?.status === "fulfilled" && result.value?.success ? (result.value.data ?? fallback) : fallback;

function copyText(text, setCopied) {
  navigator.clipboard?.writeText(text).then(
    () => setCopied("Draft copied. Review it before sending."),
    () => setCopied("Copy failed. Select the draft text and copy it manually.")
  );
  setTimeout(() => setCopied(""), 2600);
}

function ActionCard({ title, detail, to, draft, tone = "blue", icon: Icon, setCopied }) {
  const toneClass = tone === "red" ? "bg-red-50 text-red-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div className={`h-10 w-10 rounded-2xl ${toneClass} flex items-center justify-center shrink-0`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-950">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{detail}</p>
          {draft && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{draft}</div>}
          <div className="mt-3 flex flex-wrap gap-2">
            {to && <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700"><Link to={to}>Open</Link></Button>}
            {draft && <Button type="button" size="sm" variant="outline" onClick={() => copyText(draft, setCopied)}><Copy className="mr-1 h-3.5 w-3.5" />Copy draft</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const { get } = useApi();
  const { user, normalizedRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [data, setData] = useState({ stats: {}, jobs: [], quotes: [], invoices: [], workers: [], followUps: [], myob: null });

  const allowed = ["owner", "manager", "office_admin", "employer"].includes(normalizedRole || "owner");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, jobsRes, quotesRes, invoicesRes, workersRes, followUpsRes, myobRes] = await Promise.allSettled([
        get("/dashboard/stats"), get("/jobs"), get("/quotes"), get("/invoices"), get("/team/workers"), get("/follow-up-tasks"), get("/myob/settings"),
      ]);
      setData({
        stats: settledData(statsRes, {}),
        jobs: safeArray(settledData(jobsRes, [])),
        quotes: safeArray(settledData(quotesRes, [])),
        invoices: safeArray(settledData(invoicesRes, [])),
        workers: safeArray(settledData(workersRes, [])),
        followUps: safeArray(settledData(followUpsRes, [])),
        myob: settledData(myobRes, null),
      });
    } catch (err) {
      setError(safeText(err, "AI Assistant could not load."));
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const smart = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const jobs = safeArray(data.jobs);
    const quotes = safeArray(data.quotes);
    const invoices = safeArray(data.invoices);
    const followUps = safeArray(data.followUps);
    const todayJobs = jobs.filter((j) => String(j.scheduled_date || j.date || "").slice(0, 10) === today);
    const unassigned = jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "cancelled"].includes(status(j.status)));
    const stuck = jobs.filter((j) => ["paused", "blocked", "cancelled"].includes(status(j.status)));
    const overdueInvoices = invoices.filter((i) => ["overdue", "unpaid", "sent"].includes(status(i.status)) && (status(i.status) === "overdue" || isOverdue(i.due_date || i.due_at)));
    const quoteFollowups = quotes.filter((q) => ["sent", "pending", "draft"].includes(status(q.status))).slice(0, 5);
    const overdueFollowups = followUps.filter((f) => !["completed", "done", "closed"].includes(status(f.status)) && isOverdue(f.due_at || f.due_date));
    const payrollAlerts = safeNumber(data.stats?.pending_payroll_alerts || data.stats?.payroll_alerts, 0);
    const risk = Math.min(100, overdueInvoices.length * 15 + unassigned.length * 9 + stuck.length * 12 + overdueFollowups.length * 8 + payrollAlerts * 10);
    const actions = [];
    overdueInvoices.slice(0, 3).forEach((inv) => actions.push({
      title: `Follow up invoice ${safeText(inv.invoice_number || inv.number, "")}`.trim(),
      detail: `${safeText(inv.customer_name || inv.client_name, "Customer")} • ${money(inv.balance_due || inv.amount_due || inv.total)}`,
      to: `/invoices/${itemId(inv, "")}`,
      tone: "red",
      icon: Receipt,
      draft: `Hi ${safeText(inv.customer_name || inv.client_name, "there")}, just a friendly reminder that invoice ${safeText(inv.invoice_number || inv.number, "")} for ${money(inv.balance_due || inv.amount_due || inv.total)} is still showing as unpaid. Please let us know if you need the payment details resent. Thanks.`,
    }));
    quoteFollowups.slice(0, 2).forEach((q) => actions.push({
      title: `Follow up quote ${safeText(q.quote_number || q.number, "")}`.trim(),
      detail: `${safeText(q.customer_name || q.client_name, "Customer")} • ${money(q.total || q.amount)}`,
      to: `/quotes/${itemId(q, "")}`,
      tone: "blue",
      icon: FileText,
      draft: `Hi ${safeText(q.customer_name || q.client_name, "there")}, just checking in on your quote. Happy to answer any questions or make changes if needed. Thanks.`,
    }));
    unassigned.slice(0, 3).forEach((job) => actions.push({
      title: `Assign ${safeText(job.title, "job")}`,
      detail: safeText(job.customer_name || job.client_name || job.address, "No site details"),
      to: `/jobs/${itemId(job, "")}`,
      tone: "amber",
      icon: Briefcase,
    }));
    if (!actions.length) actions.push({ title: "No major fires found", detail: "Use this time to prep follow-ups, draft invoices, or improve automation rules.", to: "/automation", tone: "blue", icon: Sparkles });
    return { todayJobs, unassigned, stuck, overdueInvoices, quoteFollowups, overdueFollowups, payrollAlerts, risk, actions };
  }, [data]);

  if (!allowed) return <Layout><AppShell><SectionCard title="AI Assistant locked"><p className="text-sm text-slate-600">Only owners, managers and office admins can use the AI Business Assistant.</p></SectionCard></AppShell></Layout>;
  if (loading) return <Layout><LoadingState title="Building AI business brief" /></Layout>;
  if (error) return <Layout><ErrorState title="AI Assistant unavailable" message={error} action={<Button onClick={load}>Retry</Button>} /></Layout>;

  const riskTone = smart.risk >= 50 ? "Needs attention" : smart.risk >= 20 ? "Watch closely" : "Under control";

  return (
    <Layout>
      <AppShell data-testid="ai-assistant-page">
        <PageHeader
          title="AI Business Assistant"
          description={`A practical command layer for ${safeText(user?.business_name || "your business", "your business")}: finds risks, drafts admin, and keeps approval with you.`}
          action={<Button onClick={load} variant="outline"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}
        />
        {copied && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{copied}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-blue-100"><Bot className="h-4 w-4" /> Smart control tower</div>
                <h2 className="mt-4 text-3xl font-black">{riskTone}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-200">Today: {smart.todayJobs.length} jobs, {smart.overdueInvoices.length} overdue invoices, {smart.unassigned.length} unassigned jobs, {smart.quoteFollowups.length} quote follow-ups.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Risk</p>
                <p className="text-4xl font-black">{smart.risk}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link to="/jobs" className="rounded-2xl border border-white/10 bg-white/10 p-3 hover:bg-white/15"><Briefcase className="h-5 w-5 text-blue-200" /><p className="mt-2 text-2xl font-black">{smart.todayJobs.length}</p><p className="text-xs text-slate-300">Today jobs</p></Link>
              <Link to="/invoices" className="rounded-2xl border border-white/10 bg-white/10 p-3 hover:bg-white/15"><Receipt className="h-5 w-5 text-blue-200" /><p className="mt-2 text-2xl font-black">{smart.overdueInvoices.length}</p><p className="text-xs text-slate-300">Overdue</p></Link>
              <Link to="/quotes" className="rounded-2xl border border-white/10 bg-white/10 p-3 hover:bg-white/15"><FileText className="h-5 w-5 text-blue-200" /><p className="mt-2 text-2xl font-black">{smart.quoteFollowups.length}</p><p className="text-xs text-slate-300">Quotes</p></Link>
              <Link to="/team" className="rounded-2xl border border-white/10 bg-white/10 p-3 hover:bg-white/15"><Users className="h-5 w-5 text-blue-200" /><p className="mt-2 text-2xl font-black">{safeArray(data.workers).length}</p><p className="text-xs text-slate-300">Team</p></Link>
            </div>
          </div>

          <SectionCard title="AI safety guardrails">
            <div className="space-y-3 text-sm text-slate-700">
              <p className="flex gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />AI can suggest, draft, summarise and warn.</p>
              <p className="flex gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />You still approve messages, invoices, payroll and MYOB changes.</p>
              <p className="flex gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />Worker and payroll roles stay locked down.</p>
            </div>
          </SectionCard>
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <SectionCard title="AI priority queue" action={<span className="text-xs font-bold text-slate-500">Approval required</span>}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {smart.actions.map((action, index) => <ActionCard key={`${action.title}-${index}`} {...action} setCopied={setCopied} />)}
              </div>
            </SectionCard>
          </div>
          <div className="space-y-4">
            <SectionCard title="Findings" action={<Lightbulb className="h-5 w-5 text-amber-500" />}>
              <div className="space-y-2 text-sm text-slate-700">
                {smart.overdueInvoices.length ? <p className="rounded-xl bg-red-50 p-3 text-red-700"><AlertTriangle className="inline h-4 w-4 mr-1" />Cash needs chasing today.</p> : <p className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><CheckCircle2 className="inline h-4 w-4 mr-1" />No overdue invoices found.</p>}
                {smart.unassigned.length ? <p className="rounded-xl bg-amber-50 p-3 text-amber-700">Assign open jobs before they slip.</p> : <p className="rounded-xl bg-slate-50 p-3">No unassigned jobs found.</p>}
                {smart.payrollAlerts ? <p className="rounded-xl bg-red-50 p-3 text-red-700">Payroll has {smart.payrollAlerts} alert{smart.payrollAlerts === 1 ? "" : "s"}.</p> : <p className="rounded-xl bg-slate-50 p-3">No payroll alerts reported.</p>}
              </div>
            </SectionCard>
            <SectionCard title="Today’s job pulse">
              <div className="space-y-2">
                {smart.todayJobs.slice(0, 4).map((job, index) => <Link key={itemId(job, index)} to={`/jobs/${itemId(job, index)}`} className="block rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{safeText(job.title, "Untitled job")}</p><p className="truncate text-xs text-slate-500">{safeText(job.customer_name || job.client_name || job.address, "No details")}</p></div><StatusBadge status={job.status} /></div></Link>)}
                {!smart.todayJobs.length && <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">No jobs scheduled today.</p>}
              </div>
            </SectionCard>
          </div>
        </div>
      </AppShell>
    </Layout>
  );
}
