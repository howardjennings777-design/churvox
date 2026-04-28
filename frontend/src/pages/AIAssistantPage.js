import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import { AppShell, PageHeader, SectionCard, LoadingState, ErrorState, StatusBadge } from "../components/premium/PremiumUI";
import {
  AlertTriangle,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Copy,
  DollarSign,
  FileText,
  Lightbulb,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

const itemId = (item, fallback) => item?.id || item?._id || fallback;
const status = (value) => String(value || "").trim().toLowerCase();
const toDate = (value) => { const d = value ? new Date(value) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };
const isOverdue = (value) => { const d = toDate(value); if (!d) return false; const now = new Date(); return d < new Date(now.getFullYear(), now.getMonth(), now.getDate()); };
const money = (value) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(value || 0));
const settledData = (result, fallback) => result?.status === "fulfilled" && result.value?.success ? (result.value.data ?? fallback) : fallback;

const heroStyle = {
  background: "linear-gradient(135deg, #061426 0%, #0f2746 48%, #123b7a 100%)",
  color: "#ffffff",
  border: "1px solid rgba(96, 165, 250, 0.35)",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.22)",
};

const glassStyle = {
  background: "rgba(255, 255, 255, 0.12)",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  color: "#ffffff",
};

function copyText(text, setCopied) {
  navigator.clipboard?.writeText(text).then(
    () => setCopied("Draft copied. Review it before sending."),
    () => setCopied("Copy failed. Select the draft text and copy it manually.")
  );
  setTimeout(() => setCopied(""), 2600);
}

function valueOf(item) {
  return Number(item?.balance_due || item?.amount_due || item?.total || item?.amount || item?.price || item?.subtotal || 0) || 0;
}

function clientName(item) {
  return safeText(item?.customer_name || item?.client_name || item?.name, "Customer");
}

function jobPlace(job) {
  return safeText(job?.address || job?.customer_name || job?.client_name || "Unassigned work", "Unassigned work");
}

function groupJobs(jobs) {
  const grouped = new Map();
  safeArray(jobs).forEach((job) => {
    const key = String(job?.address || job?.customer_name || job?.client_name || job?.title || "Unassigned work").trim() || "Unassigned work";
    const existing = grouped.get(key) || { key, label: key, count: 0, jobs: [] };
    existing.count += 1;
    existing.jobs.push(job);
    grouped.set(key, existing);
  });
  return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
}

function confidenceFor(action) {
  if (action.confidence) return action.confidence;
  if (action.missingData) return "Needs review";
  return "High confidence";
}

function ConfidenceBadge({ value }) {
  const tone = value === "High confidence" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : value === "Needs review" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-700 border-slate-200";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${tone}`}>{value}</span>;
}

function MoneyCard({ icon: Icon, label, value, detail, to }) {
  const body = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function RiskReason({ label, value, points, tone = "amber", reason }) {
  const dot = tone === "red" ? "bg-red-500" : tone === "green" ? "bg-emerald-500" : tone === "blue" ? "bg-blue-500" : "bg-amber-500";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dot}`} />
          <div>
            <p className="text-sm font-black text-slate-950">{label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{reason}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-slate-950">{value}</p>
          <p className="text-[11px] font-bold text-slate-500">+{points}</p>
        </div>
      </div>
    </div>
  );
}

function RankedActionCard({ action, rank, setCopied }) {
  const Icon = action.icon;
  const toneClass = action.tone === "red" ? "bg-red-50 text-red-700" : action.tone === "amber" ? "bg-amber-50 text-amber-700" : action.tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">{rank}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${toneClass}`}><Icon className="h-4 w-4" /></span>
            <p className="font-black text-slate-950">{action.title}</p>
            <ConfidenceBadge value={confidenceFor(action)} />
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{action.detail}</p>
          <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"><strong>Why:</strong> {action.reason}</p>
          {action.draft && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{action.draft}</div>}
          <div className="mt-3 flex flex-wrap gap-2">
            {action.primaryTo && <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700"><Link to={action.primaryTo}>{action.primaryLabel || "Open"}</Link></Button>}
            {action.secondaryTo && <Button asChild size="sm" variant="outline"><Link to={action.secondaryTo}>{action.secondaryLabel}</Link></Button>}
            {action.draft && <Button type="button" size="sm" variant="outline" onClick={() => copyText(action.draft, setCopied)}><Copy className="mr-1 h-3.5 w-3.5" />Copy draft</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AutomationIdea({ title, detail, trigger, outcome }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-blue-50 p-2 text-blue-700"><Zap className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
          <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
            <p className="rounded-xl bg-slate-50 px-3 py-2"><strong>Trigger:</strong> {trigger}</p>
            <p className="rounded-xl bg-slate-50 px-3 py-2"><strong>Outcome:</strong> {outcome}</p>
          </div>
          <Button asChild size="sm" variant="outline" className="mt-3"><Link to="/automation">Create rule</Link></Button>
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
  const [reviewed, setReviewed] = useState({});
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
    const workers = safeArray(data.workers);

    const todayJobs = jobs.filter((j) => String(j.scheduled_date || j.date || "").slice(0, 10) === today);
    const unassigned = jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "cancelled"].includes(status(j.status)));
    const unassignedGroups = groupJobs(unassigned);
    const stuck = jobs.filter((j) => ["paused", "blocked", "cancelled"].includes(status(j.status)));
    const completedNoInvoice = jobs.filter((j) => status(j.status) === "completed" && !j.invoice_id && !j.invoice_number);

    const unpaidInvoices = invoices.filter((i) => ["overdue", "unpaid", "sent", "partial"].includes(status(i.status)));
    const overdueInvoices = unpaidInvoices.filter((i) => status(i.status) === "overdue" || isOverdue(i.due_date || i.due_at));
    const draftInvoices = invoices.filter((i) => status(i.status) === "draft");
    const quoteFollowups = quotes.filter((q) => ["sent", "pending", "draft"].includes(status(q.status)));
    const overdueFollowups = followUps.filter((f) => !["completed", "done", "closed"].includes(status(f.status)) && isOverdue(f.due_at || f.due_date));
    const payrollAlerts = safeNumber(data.stats?.pending_payroll_alerts || data.stats?.payroll_alerts, 0);

    const quoteValue = quoteFollowups.reduce((sum, q) => sum + valueOf(q), 0);
    const unpaidValue = unpaidInvoices.reduce((sum, i) => sum + valueOf(i), 0);
    const overdueValue = overdueInvoices.reduce((sum, i) => sum + valueOf(i), 0);
    const draftInvoiceValue = draftInvoices.reduce((sum, i) => sum + valueOf(i), 0);
    const uninvoicedJobValue = completedNoInvoice.reduce((sum, j) => sum + valueOf(j), 0);

    const riskBreakdown = [
      { label: "Unassigned jobs", value: unassigned.length, points: unassigned.length * 9, tone: unassigned.length ? "amber" : "green", reason: unassigned.length ? "Work exists but no worker owns it yet." : "No open unassigned jobs found." },
      { label: "Quote follow-ups", value: quoteFollowups.length, points: quoteFollowups.length * 6, tone: quoteFollowups.length ? "blue" : "green", reason: quoteFollowups.length ? "Potential revenue is waiting for a customer decision." : "No quote follow-ups found." },
      { label: "Overdue invoices", value: overdueInvoices.length, points: overdueInvoices.length * 15, tone: overdueInvoices.length ? "red" : "green", reason: overdueInvoices.length ? "Cash should be chased before more admin piles up." : "No overdue invoices found." },
      { label: "Stuck jobs", value: stuck.length, points: stuck.length * 12, tone: stuck.length ? "red" : "green", reason: stuck.length ? "Paused, blocked or cancelled jobs need a decision." : "No stuck jobs found." },
      { label: "Payroll alerts", value: payrollAlerts, points: payrollAlerts * 10, tone: payrollAlerts ? "red" : "green", reason: payrollAlerts ? "Timesheet/payroll items need review before pay is prepared." : "No payroll alerts reported." },
    ];
    const risk = Math.min(100, riskBreakdown.reduce((sum, item) => sum + item.points, 0) + overdueFollowups.length * 8);

    const actions = [];
    if (unassignedGroups.length) {
      const top = unassignedGroups[0];
      const first = top.jobs[0];
      actions.push({
        title: top.count > 1 ? `Assign ${top.count} jobs at ${safeText(top.label, "this site")}` : `Assign ${safeText(first?.title, "job")}`,
        detail: top.count > 1 ? `${top.count} unassigned jobs grouped together so the page does not feel repetitive.` : jobPlace(first),
        reason: "Unassigned jobs are the biggest operational risk because nobody is accountable yet.",
        primaryTo: `/jobs/${itemId(first, "")}`,
        primaryLabel: "Assign worker",
        secondaryTo: "/jobs",
        secondaryLabel: "View jobs",
        impact: 28,
        confidence: first?.address ? "High confidence" : "Needs review",
        missingData: !first?.address,
        tone: "amber",
        icon: Briefcase,
      });
    }
    if (quoteFollowups.length) {
      const q = quoteFollowups[0];
      actions.push({
        title: `Chase ${quoteFollowups.length} quote${quoteFollowups.length === 1 ? "" : "s"}`,
        detail: `${money(quoteValue)} potential revenue waiting. Start with ${clientName(q)}.`,
        reason: "Quotes are warm opportunities; a short follow-up can recover work without changing pricing.",
        primaryTo: `/quotes/${itemId(q, "")}`,
        primaryLabel: "Open quote",
        secondaryTo: "/follow-ups",
        secondaryLabel: "Create follow-up task",
        draft: `Hi ${clientName(q)}, just checking in on your quote. Happy to answer any questions or make changes if needed. Thanks.`,
        impact: 18,
        confidence: valueOf(q) > 0 ? "High confidence" : "Needs review",
        tone: "blue",
        icon: FileText,
      });
    }
    if (overdueInvoices.length) {
      const inv = overdueInvoices[0];
      actions.push({
        title: `Recover ${money(overdueValue)} overdue cash`,
        detail: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"}. Start with ${clientName(inv)}.`,
        reason: "Overdue invoices directly affect cash flow and should be handled before new admin work.",
        primaryTo: `/invoices/${itemId(inv, "")}`,
        primaryLabel: "Open invoice",
        secondaryTo: "/follow-ups",
        secondaryLabel: "Create reminder",
        draft: `Hi ${clientName(inv)}, just a friendly reminder that invoice ${safeText(inv.invoice_number || inv.number, "")} for ${money(valueOf(inv))} is still showing as unpaid. Please let us know if you need the payment details resent. Thanks.`,
        impact: 24,
        confidence: "High confidence",
        tone: "red",
        icon: Receipt,
      });
    }
    if (!todayJobs.length && unassigned.length) {
      actions.push({
        title: "Build today’s schedule",
        detail: "No jobs are scheduled today, but there is unassigned work waiting.",
        reason: "A clear schedule turns the open work list into a controlled day plan.",
        primaryTo: "/schedule",
        primaryLabel: "Build schedule",
        secondaryTo: "/team",
        secondaryLabel: "Check team",
        impact: 16,
        confidence: "High confidence",
        tone: "blue",
        icon: CalendarDays,
      });
    }
    if (completedNoInvoice.length) {
      const job = completedNoInvoice[0];
      actions.push({
        title: `Invoice ${completedNoInvoice.length} completed job${completedNoInvoice.length === 1 ? "" : "s"}`,
        detail: `${money(uninvoicedJobValue)} estimated value may be waiting to invoice.`,
        reason: "Completed work should become a draft invoice quickly so revenue does not leak.",
        primaryTo: `/jobs/${itemId(job, "")}`,
        primaryLabel: "Create invoice",
        secondaryTo: "/invoices/new",
        secondaryLabel: "New invoice",
        impact: 20,
        confidence: uninvoicedJobValue > 0 ? "High confidence" : "Needs review",
        tone: "green",
        icon: DollarSign,
      });
    }
    if (!actions.length) {
      actions.push({
        title: "No major fires found",
        detail: "Use this time to prepare follow-ups, draft invoices or improve automation rules.",
        reason: "The current business data does not show urgent work, so the best move is prevention.",
        primaryTo: "/automation",
        primaryLabel: "Improve automation",
        impact: 8,
        confidence: "High confidence",
        tone: "green",
        icon: Sparkles,
      });
    }

    const rankedActions = actions.sort((a, b) => b.impact - a.impact).slice(0, 5);
    const afterRisk = Math.max(0, risk - rankedActions.slice(0, 3).reduce((sum, action) => sum + Math.min(action.impact, 24), 0));
    const businessBrief = risk >= 50
      ? `Best move: assign the unassigned jobs first, then chase quotes before the afternoon. Clearing the top 3 actions could drop risk from ${risk} to around ${afterRisk}.`
      : risk >= 20
        ? `Business is mostly steady, but there are still follow-ups worth clearing. Clear the top actions to bring risk down near ${afterRisk}.`
        : "No major fires right now. Use the AI queue to stay ahead instead of waiting for admin to pile up.";

    const automationIdeas = [
      quoteFollowups.length > 0 && { title: "Quote follow-up automation", detail: "Automatically create a follow-up task when a quote has not been accepted after 3 days.", trigger: "Quote sent and still pending after 3 days", outcome: "Create follow-up task for owner/admin" },
      completedNoInvoice.length > 0 && { title: "Completed job to draft invoice", detail: "When a job is completed, prepare a draft invoice for owner/admin approval.", trigger: "Job status becomes completed", outcome: "Create draft invoice, never auto-send" },
      unassigned.length > 0 && { title: "Unassigned job warning", detail: "Warn the owner if a job stays unassigned for too long.", trigger: "Job created and no worker assigned", outcome: "Notify owner or manager" },
      overdueInvoices.length > 0 && { title: "Invoice reminder automation", detail: "Prepare a polite payment reminder when an invoice becomes overdue.", trigger: "Invoice due date passes", outcome: "Create reminder draft for approval" },
    ].filter(Boolean).slice(0, 3);

    return { todayJobs, unassigned, unassignedGroups, stuck, unpaidInvoices, overdueInvoices, draftInvoices, quoteFollowups, overdueFollowups, payrollAlerts, risk, afterRisk, riskBreakdown, rankedActions, businessBrief, quoteValue, unpaidValue, overdueValue, draftInvoiceValue, uninvoicedJobValue, completedNoInvoice, automationIdeas, workers };
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
          description={`A practical command layer for ${safeText(user?.business_name || "your business", "your business")}: ranked actions, risk reasons, money impact and approval-first automation.`}
          action={<Button onClick={load} variant="outline"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}
        />
        {copied && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{copied}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="rounded-3xl p-5" style={heroStyle}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold" style={glassStyle}><Bot className="h-4 w-4" /> Smart control tower</div>
                <h2 className="mt-4 text-3xl font-black" style={{ color: "#ffffff" }}>{riskTone}</h2>
                <p className="mt-2 text-sm leading-6" style={{ color: "#dbeafe" }}>{smart.businessBrief}</p>
              </div>
              <div className="rounded-3xl px-5 py-4 text-center" style={glassStyle}>
                <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#bfdbfe" }}>Risk</p>
                <p className="text-4xl font-black" style={{ color: "#ffffff" }}>{smart.risk}</p>
                <p className="text-xs font-bold" style={{ color: "#dbeafe" }}>Can drop to {smart.afterRisk}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link to="/jobs" className="rounded-2xl p-3 hover:opacity-90" style={glassStyle}><Briefcase className="h-5 w-5" style={{ color: "#bfdbfe" }} /><p className="mt-2 text-2xl font-black" style={{ color: "#ffffff" }}>{smart.unassigned.length}</p><p className="text-xs" style={{ color: "#dbeafe" }}>Unassigned</p></Link>
              <Link to="/invoices" className="rounded-2xl p-3 hover:opacity-90" style={glassStyle}><Receipt className="h-5 w-5" style={{ color: "#bfdbfe" }} /><p className="mt-2 text-2xl font-black" style={{ color: "#ffffff" }}>{smart.overdueInvoices.length}</p><p className="text-xs" style={{ color: "#dbeafe" }}>Overdue</p></Link>
              <Link to="/quotes" className="rounded-2xl p-3 hover:opacity-90" style={glassStyle}><FileText className="h-5 w-5" style={{ color: "#bfdbfe" }} /><p className="mt-2 text-2xl font-black" style={{ color: "#ffffff" }}>{smart.quoteFollowups.length}</p><p className="text-xs" style={{ color: "#dbeafe" }}>Quotes</p></Link>
              <Link to="/team" className="rounded-2xl p-3 hover:opacity-90" style={glassStyle}><Users className="h-5 w-5" style={{ color: "#bfdbfe" }} /><p className="mt-2 text-2xl font-black" style={{ color: "#ffffff" }}>{smart.workers.length}</p><p className="text-xs" style={{ color: "#dbeafe" }}>Team</p></Link>
            </div>
          </div>

          <SectionCard title={`Why risk is ${smart.risk}`} action={<Target className="h-5 w-5 text-blue-600" />}>
            <div className="space-y-2">
              {smart.riskBreakdown.map((item) => <RiskReason key={item.label} {...item} />)}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Today’s AI business brief" action={<Sparkles className="h-5 w-5 text-blue-600" />}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 lg:col-span-2">
              <p className="text-sm font-black text-blue-950">Recommended move</p>
              <p className="mt-2 text-sm leading-6 text-blue-900">{smart.businessBrief}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-black text-emerald-900">Approval-first</p>
              <p className="mt-2 text-sm leading-6 text-emerald-800">AI prepares the work. You approve customer messages, invoices, payroll, pricing and MYOB changes.</p>
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MoneyCard icon={TrendingUp} label="Potential quote revenue" value={money(smart.quoteValue)} detail={`${smart.quoteFollowups.length} quote follow-up${smart.quoteFollowups.length === 1 ? "" : "s"}`} to="/quotes" />
          <MoneyCard icon={Receipt} label="Unpaid invoice value" value={money(smart.unpaidValue)} detail={`${smart.unpaidInvoices.length} unpaid invoice${smart.unpaidInvoices.length === 1 ? "" : "s"}`} to="/invoices" />
          <MoneyCard icon={AlertTriangle} label="Overdue cash" value={money(smart.overdueValue)} detail={`${smart.overdueInvoices.length} overdue invoice${smart.overdueInvoices.length === 1 ? "" : "s"}`} to="/invoices" />
          <MoneyCard icon={DollarSign} label="Draft / uninvoiced" value={money(smart.draftInvoiceValue + smart.uninvoicedJobValue)} detail="Draft invoices and completed jobs" to="/invoices" />
        </div>

        <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <SectionCard title="Ranked AI priority queue" action={<span className="text-xs font-bold text-slate-500">Ranked by impact</span>}>
              <div className="space-y-3">
                {smart.rankedActions.map((action, index) => (
                  <div key={`${action.title}-${index}`} className={reviewed[action.title] ? "opacity-60" : ""}>
                    <RankedActionCard action={action} rank={index + 1} setCopied={setCopied} />
                    <button type="button" onClick={() => setReviewed((prev) => ({ ...prev, [action.title]: !prev[action.title] }))} className="mt-2 text-xs font-bold text-slate-500 hover:text-blue-700">
                      {reviewed[action.title] ? "Mark as active" : "Mark reviewed"}
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
          <div className="space-y-4">
            <SectionCard title="Grouped job cleanup" action={<Briefcase className="h-5 w-5 text-amber-600" />}>
              <div className="space-y-2">
                {smart.unassignedGroups.slice(0, 4).map((group) => (
                  <Link key={group.key} to={`/jobs/${itemId(group.jobs[0], "")}`} className="block rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50">
                    <p className="text-sm font-black text-slate-950">{group.count} job{group.count === 1 ? "" : "s"}</p>
                    <p className="mt-1 truncate text-xs text-slate-600">{group.label}</p>
                  </Link>
                ))}
                {!smart.unassignedGroups.length && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">No unassigned job groups.</p>}
              </div>
            </SectionCard>
            <SectionCard title="Live job pulse">
              <div className="space-y-2">
                {smart.todayJobs.slice(0, 4).map((job, index) => <Link key={itemId(job, index)} to={`/jobs/${itemId(job, index)}`} className="block rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{safeText(job.title, "Untitled job")}</p><p className="truncate text-xs text-slate-500">{safeText(job.customer_name || job.client_name || job.address, "No details")}</p></div><StatusBadge status={job.status} /></div></Link>)}
                {!smart.todayJobs.length && <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">No jobs scheduled today.</p>}
              </div>
            </SectionCard>
          </div>
        </div>

        <SectionCard title="AI automation suggestions" action={<Lightbulb className="h-5 w-5 text-amber-500" />}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {smart.automationIdeas.map((idea) => <AutomationIdea key={idea.title} {...idea} />)}
            {!smart.automationIdeas.length && <AutomationIdea title="Daily business brief" detail="Create a morning reminder to review the AI Assistant and clear the top three actions." trigger="Every weekday morning" outcome="Notify owner with today’s brief" />}
          </div>
        </SectionCard>

        <SectionCard title="AI safety guardrails">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm text-slate-700">
            <p className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-4"><ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />AI suggests, drafts, summarises and warns.</p>
            <p className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-4"><ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />You approve messages, invoices, payroll and MYOB changes.</p>
            <p className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-4"><ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />Worker and payroll roles stay locked down.</p>
          </div>
        </SectionCard>
      </AppShell>
    </Layout>
  );
}
