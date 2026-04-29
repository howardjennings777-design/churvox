import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import {
  AlertTriangle,
  Brain,
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
  Users,
  Zap,
} from "lucide-react";

const status = (value) => String(value || "").trim().toLowerCase();
const idOf = (item, fallback = "") => item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id || fallback;
const todayKey = () => new Date().toISOString().slice(0, 10);
const money = (value) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(value || 0));
const toDate = (value) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};
const isOverdue = (value) => {
  const parsed = toDate(value);
  if (!parsed) return false;
  const now = new Date();
  return parsed < new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
const apiData = (result, fallback) => result?.status === "fulfilled" && result.value?.success ? (result.value.data ?? fallback) : fallback;
const pickList = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  return safeArray(value);
};
const valueOf = (item) => Number(item?.balance_due || item?.amount_due || item?.total || item?.amount || item?.price || item?.subtotal || item?.job_price || 0) || 0;
const clientName = (item) => safeText(item?.customer_name || item?.client_name || item?.client || item?.name, "Customer");
const jobTitle = (job) => safeText(job?.title || job?.job_title || job?.name, "Untitled job");

const darkPanelStyle = {
  background: "linear-gradient(135deg, #071120 0%, #0f2746 45%, #0b5bd3 100%)",
  border: "1px solid rgba(96, 165, 250, 0.35)",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.22)",
  color: "#ffffff",
};
const glassStyle = { background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "#ffffff" };
const whiteCardStyle = { background: "#ffffff", color: "#0f172a", border: "1px solid #dbe3ef", boxShadow: "0 14px 34px rgba(15,23,42,0.08)" };

function copyText(text, setCopied) {
  if (!text) return;
  navigator.clipboard?.writeText(text).then(
    () => setCopied("Draft copied. Review it before sending."),
    () => setCopied("Copy failed. Select the draft text and copy it manually.")
  );
  setTimeout(() => setCopied(""), 2600);
}

function ActionLink({ to, children, variant = "primary" }) {
  if (!to) return null;
  const cls = variant === "primary"
    ? "inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-700"
    : "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50";
  return <Link to={to} className={cls}>{children}</Link>;
}

function Section({ title, subtitle, icon: Icon, children, dark = false }) {
  if (dark) {
    return (
      <section className="rounded-3xl p-5" style={darkPanelStyle}>
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black" style={glassStyle}>{Icon && <Icon className="h-4 w-4" />}{title}</div>
          {subtitle && <p className="mt-2 text-sm font-semibold leading-6" style={{ color: "#dbeafe" }}>{subtitle}</p>}
        </div>
        {children}
      </section>
    );
  }
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">{Icon && <Icon className="h-5 w-5 text-blue-600" />}{title}</h2>
        {subtitle && <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone = "blue", to }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-700 border-red-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
  };
  const body = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${tones[tone] || tones.blue}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function Pill({ children, tone = "blue" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-black ${tones[tone] || tones.blue}`}>{children}</span>;
}

function RiskItem({ label, value, points, tone, reason }) {
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
        <div className="text-right"><p className="text-sm font-black text-slate-950">{value}</p><p className="text-[11px] font-bold text-slate-500">+{points}</p></div>
      </div>
    </div>
  );
}

function ActionCard({ action, rank, reviewed, onToggleReviewed, setCopied }) {
  const Icon = action.icon || Sparkles;
  const toneClass = action.tone === "red" ? "bg-red-50 text-red-700" : action.tone === "amber" ? "bg-amber-50 text-amber-700" : action.tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition ${reviewed ? "opacity-60" : "hover:shadow-md"}`}>
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">{rank}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${toneClass}`}><Icon className="h-4 w-4" /></span>
            <p className="font-black text-slate-950">{action.title}</p>
            <Pill tone={action.confidence === "Needs review" ? "amber" : "green"}>{action.confidence || "Review"}</Pill>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{action.detail}</p>
          <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"><strong className="text-slate-950">Why:</strong> {action.reason}</p>
          {action.draft && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{action.draft}</div>}
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionLink to={action.primaryTo}>{action.primaryLabel || "Open"}</ActionLink>
            <ActionLink to={action.secondaryTo} variant="secondary">{action.secondaryLabel || "Review"}</ActionLink>
            {action.draft && <button type="button" onClick={() => copyText(action.draft, setCopied)} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Copy className="mr-1 h-3.5 w-3.5" />Copy draft</button>}
            <button type="button" onClick={onToggleReviewed} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-50">{reviewed ? "Mark active" : "Mark reviewed"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AutomationCard({ title, detail, trigger, outcome }) {
  return (
    <div className="rounded-2xl p-4" style={whiteCardStyle}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-blue-50 p-2 text-blue-700"><Zap className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-950">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{detail}</p>
          <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"><strong className="text-slate-950">Trigger:</strong> {trigger}</p>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"><strong className="text-slate-950">Outcome:</strong> {outcome}</p>
          </div>
          <Link to="/automation" className="mt-3 inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50">Create rule</Link>
        </div>
      </div>
    </div>
  );
}

function GuardrailCard({ children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" /><p className="text-sm font-semibold leading-6 text-slate-700">{children}</p></div>
    </div>
  );
}

function AIQueueActionCard({ action, onApprove, onSnooze, onDismiss, onComplete }) {
  const priorityTone = action.priority === "high" ? "red" : action.priority === "medium" ? "amber" : "green";
  const confidenceTone = action.confidence === "high" ? "green" : action.confidence === "medium" ? "blue" : "amber";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-black text-slate-950">{safeText(action.title, "AI action")}</p>
        <Pill tone={priorityTone}>Priority: {safeText(action.priority, "medium")}</Pill>
        <Pill tone={confidenceTone}>Confidence: {safeText(action.confidence, "medium")}</Pill>
      </div>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{safeText(action.description, "No details yet.")}</p>
      <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"><strong className="text-slate-950">Why:</strong> {safeText(action.reason, "AI suggests. You approve.")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {action.route ? <Link to={action.route} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-700">{safeText(action.cta_label, "Open")}</Link> : <span className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">No route</span>}
        <button type="button" onClick={onApprove} className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100">Approve</button>
        <button type="button" onClick={onSnooze} className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">Snooze</button>
        <button type="button" onClick={onDismiss} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Dismiss</button>
        <button type="button" onClick={onComplete} className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">Mark done</button>
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const { get, post } = useApi();
  const { user, normalizedRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [queueNotice, setQueueNotice] = useState("");
  const [automationNotice, setAutomationNotice] = useState("");
  const [reviewed, setReviewed] = useState({});
  const [brief, setBrief] = useState(null);
  const [teamPayroll, setTeamPayroll] = useState(null);
  const [memory, setMemory] = useState([]);
  const [briefNotice, setBriefNotice] = useState("");
  const [data, setData] = useState({ stats: {}, jobs: [], quotes: [], invoices: [], workers: [], followUps: [], aiActions: [], automationSuggestions: [] });

  const allowed = ["owner", "manager", "office_admin", "employer", "admin"].includes(normalizedRole || "owner");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, jobsRes, quotesRes, invoicesRes, workersRes, followUpsRes, aiActionsRes, automationSuggestionsRes, briefRes, memoryRes, teamPayrollRes] = await Promise.allSettled([
        get("/dashboard/stats"), get("/jobs"), get("/quotes"), get("/invoices"), get("/team/workers"), get("/follow-up-tasks"), get("/ai/actions"), get("/ai/automation-suggestions"),
        get("/ai/daily-brief"), get("/ai/business-memory"), get("/ai/team-payroll"),
      ]);
      setData({
        stats: apiData(statsRes, {}) || {},
        jobs: pickList(apiData(jobsRes, []), ["jobs", "items", "data"]),
        quotes: pickList(apiData(quotesRes, []), ["quotes", "items", "data"]),
        invoices: pickList(apiData(invoicesRes, []), ["invoices", "items", "data"]),
        workers: pickList(apiData(workersRes, []), ["workers", "team", "items", "data"]),
        followUps: pickList(apiData(followUpsRes, []), ["follow_ups", "tasks", "items", "data"]),
        aiActions: pickList(apiData(aiActionsRes, []), ["actions", "items", "data"]),
        automationSuggestions: pickList(apiData(automationSuggestionsRes, []), ["suggestions", "items", "data"]),
      });
      setBrief((apiData(briefRes, {}) || {}).brief || null);
      setMemory(pickList(apiData(memoryRes, []), ["memory", "items", "data"]));
      setTeamPayroll((apiData(teamPayrollRes, {}) || {}).snapshot || null);
    } catch (err) {
      setError(safeText(err?.message || err, "Smart Hub could not load."));
    } finally {
      setLoading(false);
    }
  }, [get]);

  const refreshAiActions = useCallback(async () => {
    const result = await post("/ai/actions/generate", {});
    if (!result?.success) {
      setQueueNotice(safeText(result?.error, "Could not refresh AI actions."));
      return;
    }
    const payload = result?.data || {};
    setQueueNotice(`AI suggests. You approve. Draft only. ${safeNumber(payload.created, 0)} created, ${safeNumber(payload.updated, 0)} updated.`);
    await load();
  }, [load, post]);

  const updateAiAction = useCallback(async (actionId, verb, successMessage) => {
    const result = await post(`/ai/actions/${actionId}/${verb}`, {});
    if (!result?.success) {
      setQueueNotice(safeText(result?.error, "AI action update failed."));
      return;
    }
    setQueueNotice(successMessage);
    await load();
  }, [load, post]);

  const generateAutomationSuggestions = useCallback(async () => {
    const result = await post("/ai/automation-suggestions/generate", {});
    if (!result?.success) {
      setAutomationNotice(safeText(result?.error, "Could not generate AI automation suggestions."));
      return;
    }
    const payload = result?.data || {};
    setAutomationNotice(`AI suggests automation. You approve before anything runs. ${safeNumber(payload.created, 0)} created, ${safeNumber(payload.updated, 0)} refreshed.`);
    await load();
  }, [load, post]);

  const updateAutomationSuggestion = useCallback(async (suggestionId, verb, successMessage) => {
    const result = await post(`/ai/automation-suggestions/${suggestionId}/${verb}`, {});
    if (!result?.success) {
      setAutomationNotice(safeText(result?.error, "Could not update AI automation suggestion."));
      return;
    }
    setAutomationNotice(successMessage);
    await load();
  }, [load, post]);
  const generateDailyBrief = useCallback(async () => {
    const result = await post("/ai/daily-brief/generate", {});
    if (!result?.success) return setBriefNotice(safeText(result?.error, "Could not generate daily brief."));
    setBriefNotice("AI highlights patterns. You decide what to do.");
    await load();
  }, [load, post]);
  const generateTeamPayroll = useCallback(async () => {
    const result = await post("/ai/team-payroll/generate", {});
    if (!result?.success) return setBriefNotice(safeText(result?.error, "Could not generate team/payroll watchtower."));
    setBriefNotice("AI highlights team and payroll risks. It does not approve payroll, change rates, edit timesheets, or pay workers.");
    await load();
  }, [load, post]);
  const refreshBusinessMemory = useCallback(async () => {
    const result = await post("/ai/business-memory/refresh", {});
    if (!result?.success) return setBriefNotice(safeText(result?.error, "Could not refresh business memory."));
    setBriefNotice("Business memory refreshed.");
    await load();
  }, [load, post]);
  const dismissMemory = useCallback(async (id) => {
    const result = await post(`/ai/business-memory/${id}/dismiss`, {});
    if (!result?.success) return setBriefNotice(safeText(result?.error, "Could not dismiss memory."));
    await load();
  }, [load, post]);

  useEffect(() => { load(); }, [load]);

  const smart = useMemo(() => {
    const jobs = safeArray(data.jobs);
    const quotes = safeArray(data.quotes);
    const invoices = safeArray(data.invoices);
    const workers = safeArray(data.workers);
    const followUps = safeArray(data.followUps);
    const aiActions = safeArray(data.aiActions);
    const today = todayKey();

    const openJobs = jobs.filter((job) => !["completed", "cancelled"].includes(status(job.status)));
    const todayJobs = jobs.filter((job) => String(job.scheduled_date || job.date || job.start_date || "").slice(0, 10) === today);
    const assignedJobs = jobs.filter((job) => Boolean(job.assigned_worker_id || job.worker_id || job.assigned_to));
    const inProgressJobs = jobs.filter((job) => ["in_progress", "in progress", "started"].includes(status(job.status)));
    const completedJobs = jobs.filter((job) => status(job.status) === "completed");
    const unassignedJobs = openJobs.filter((job) => !job.assigned_worker_id && !job.worker_id && !job.assigned_to);
    const stuckJobs = jobs.filter((job) => ["paused", "blocked", "stuck"].includes(status(job.status)));
    const completedNoInvoice = completedJobs.filter((job) => !job.invoice_id && !job.invoice_number);

    const quoteFollowups = quotes.filter((quote) => ["sent", "pending", "draft"].includes(status(quote.status)));
    const unpaidInvoices = invoices.filter((invoice) => ["unpaid", "sent", "partial", "overdue"].includes(status(invoice.status)));
    const overdueInvoices = unpaidInvoices.filter((invoice) => status(invoice.status) === "overdue" || isOverdue(invoice.due_date || invoice.due_at));
    const draftInvoices = invoices.filter((invoice) => status(invoice.status) === "draft");
    const overdueFollowUps = followUps.filter((task) => !["completed", "done", "closed"].includes(status(task.status)) && isOverdue(task.due_at || task.due_date));
    const payrollAlerts = safeNumber(data.stats?.pending_payroll_alerts || data.stats?.payroll_alerts, 0);

    const quoteValue = quoteFollowups.reduce((sum, item) => sum + valueOf(item), 0);
    const unpaidValue = unpaidInvoices.reduce((sum, item) => sum + valueOf(item), 0);
    const overdueValue = overdueInvoices.reduce((sum, item) => sum + valueOf(item), 0);
    const draftValue = draftInvoices.reduce((sum, item) => sum + valueOf(item), 0);
    const uninvoicedValue = completedNoInvoice.reduce((sum, item) => sum + valueOf(item), 0);

    const riskItems = [
      { label: "Unassigned jobs", value: unassignedJobs.length, points: unassignedJobs.length * 8, tone: unassignedJobs.length ? "amber" : "green", reason: unassignedJobs.length ? "Open work exists without a responsible worker." : "No unassigned open jobs found." },
      { label: "Quote follow-ups", value: quoteFollowups.length, points: quoteFollowups.length * 5, tone: quoteFollowups.length ? "blue" : "green", reason: quoteFollowups.length ? "Warm revenue is waiting for customer decisions." : "No quote follow-ups waiting." },
      { label: "Overdue invoices", value: overdueInvoices.length, points: overdueInvoices.length * 14, tone: overdueInvoices.length ? "red" : "green", reason: overdueInvoices.length ? "Overdue cash needs attention before it becomes harder to collect." : "No overdue invoices found." },
      { label: "Stuck jobs", value: stuckJobs.length, points: stuckJobs.length * 10, tone: stuckJobs.length ? "red" : "green", reason: stuckJobs.length ? "Paused or blocked jobs need a decision." : "No stuck jobs found." },
      { label: "Payroll alerts", value: payrollAlerts, points: payrollAlerts * 10, tone: payrollAlerts ? "red" : "green", reason: payrollAlerts ? "Timesheet or payroll items need review." : "No payroll alerts reported." },
    ];

    const risk = Math.min(100, riskItems.reduce((sum, item) => sum + item.points, 0) + overdueFollowUps.length * 6);
    const actions = [];

    if (unassignedJobs.length) {
      const first = unassignedJobs[0];
      actions.push({ title: `Assign ${unassignedJobs.length} open job${unassignedJobs.length === 1 ? "" : "s"}`, detail: safeText(first?.address || first?.client_name || first?.customer_name || jobTitle(first), "Unassigned work is waiting."), reason: "Unassigned jobs are the biggest day-to-day risk because nobody owns the work yet.", confidence: "High confidence", tone: "amber", icon: Briefcase, primaryTo: idOf(first) ? `/jobs/${idOf(first)}` : "/jobs", primaryLabel: "Assign worker", secondaryTo: "/schedule", secondaryLabel: "Open schedule" });
    }
    if (overdueInvoices.length) {
      const first = overdueInvoices[0];
      actions.push({ title: `Recover ${money(overdueValue)} overdue cash`, detail: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"}. Start with ${clientName(first)}.`, reason: "Cash flow matters. Overdue invoices should be handled before new admin piles up.", confidence: "High confidence", tone: "red", icon: Receipt, primaryTo: idOf(first) ? `/invoices/${idOf(first)}` : "/invoices", primaryLabel: "Open invoice", secondaryTo: "/follow-ups", secondaryLabel: "Create reminder", draft: `Hi ${clientName(first)}, just a friendly reminder that invoice ${safeText(first?.invoice_number || first?.number, "")} for ${money(valueOf(first))} is still showing as unpaid. Please let us know if you need the payment details resent. Thanks.` });
    }
    if (quoteFollowups.length) {
      const first = quoteFollowups[0];
      actions.push({ title: `Follow up ${quoteFollowups.length} quote${quoteFollowups.length === 1 ? "" : "s"}`, detail: `${money(quoteValue)} potential revenue waiting. Start with ${clientName(first)}.`, reason: "Quote follow-ups can recover work without changing pricing.", confidence: valueOf(first) > 0 ? "High confidence" : "Needs review", tone: "blue", icon: FileText, primaryTo: idOf(first) ? `/quotes/${idOf(first)}` : "/quotes", primaryLabel: "Open quote", secondaryTo: "/follow-ups", secondaryLabel: "Create task", draft: `Hi ${clientName(first)}, just checking in on your quote. Happy to answer any questions or make changes if needed. Thanks.` });
    }
    if (!todayJobs.length && unassignedJobs.length) actions.push({ title: "Build today’s schedule", detail: "No jobs are scheduled today, but unassigned work is waiting.", reason: "A clear day plan turns the open work list into controlled work.", confidence: "High confidence", tone: "green", icon: CalendarDays, primaryTo: "/schedule", primaryLabel: "Build schedule", secondaryTo: "/team", secondaryLabel: "Check team" });
    if (completedNoInvoice.length) {
      const first = completedNoInvoice[0];
      actions.push({ title: `Invoice ${completedNoInvoice.length} completed job${completedNoInvoice.length === 1 ? "" : "s"}`, detail: `${money(uninvoicedValue)} estimated value may be waiting to invoice.`, reason: "Completed work should become a draft invoice quickly so revenue does not leak.", confidence: uninvoicedValue > 0 ? "High confidence" : "Needs review", tone: "green", icon: DollarSign, primaryTo: idOf(first) ? `/jobs/${idOf(first)}` : "/jobs", primaryLabel: "Open job", secondaryTo: "/invoices/new", secondaryLabel: "New invoice" });
    }
    if (!actions.length) actions.push({ title: "No major fires found", detail: "Smart Hub does not see urgent work right now.", reason: "Use the quiet time to improve follow-ups, draft invoices, or set up automations.", confidence: "High confidence", tone: "green", icon: CheckCircle2, primaryTo: "/automation", primaryLabel: "Improve automation" });

    const afterRisk = Math.max(0, risk - Math.min(60, actions.length * 16));
    const businessBrief = risk >= 50 ? `Best move: clear the top actions first. That could drop risk from ${risk} to around ${afterRisk}.` : risk >= 20 ? `Business is steady, but there are still admin items worth clearing. Risk can drop near ${afterRisk}.` : "No major fires right now. Stay ahead by clearing follow-ups and keeping automation rules tidy.";
    const automationIdeas = [
      { title: "Quote follow-up automation", detail: "Create a follow-up task when a quote has not been accepted after 3 days.", trigger: "Quote sent and still pending after 3 days", outcome: "Create follow-up task for owner/admin" },
      { title: "Completed job to draft invoice", detail: "Prepare a draft invoice for owner/admin approval when a job is completed.", trigger: "Job status becomes completed", outcome: "Create draft invoice, never auto-send" },
      { title: "Unassigned job warning", detail: "Warn the owner if a job stays unassigned for too long.", trigger: "Job created and no worker assigned", outcome: "Notify owner or manager" },
    ];

    return { jobs, quotes, invoices, workers, todayJobs, assignedJobs, inProgressJobs, completedJobs, unassignedJobs, stuckJobs, quoteFollowups, unpaidInvoices, overdueInvoices, draftInvoices, completedNoInvoice, riskItems, risk, afterRisk, actions: actions.slice(0, 5), aiActions, automationSuggestions: safeArray(data.automationSuggestions), businessBrief, quoteValue, unpaidValue, overdueValue, draftValue, uninvoicedValue, automationIdeas };
  }, [data]);

  const riskTone = smart.risk >= 50 ? "Needs attention" : smart.risk >= 20 ? "Watch closely" : "Under control";

  if (!allowed) return <Layout><div className="cx-page"><Section title="Smart Hub locked" icon={ShieldCheck}><p className="text-sm font-semibold text-slate-600">Only owners, managers and office admins can use Smart Hub.</p></Section></div></Layout>;
  if (loading) return <Layout><div className="cx-page"><Section title="Building Smart Hub" icon={RefreshCw}><p className="text-sm font-semibold text-slate-600">Loading business data and ranking today’s priorities...</p></Section></div></Layout>;
  if (error) return <Layout><div className="cx-page"><Section title="Smart Hub could not load" icon={AlertTriangle}><p className="text-sm font-semibold text-slate-600">{error}</p><button onClick={load} className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700">Retry</button></Section></div></Layout>;

  return (
    <Layout>
      <div className="cx-page space-y-6" data-testid="ai-assistant-page">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-[#f6f9ff] to-[#eef6ff] p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Smart Hub</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">AI Business Assistant</h1><p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">A practical command layer for {safeText(user?.business_name || "your business", "your business")}: risks, ranked actions, follow-up drafts, automation suggestions and approval-first guardrails.</p></div>
            <button onClick={load} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"><RefreshCw className="mr-2 h-4 w-4" />Refresh</button>
          </div>
        </section>

        {copied && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">{copied}</div>}
        {queueNotice && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800">{queueNotice}</div>}
        {briefNotice && <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-800">{briefNotice}</div>}

        <Section title="AI Daily Brief" subtitle="AI highlights patterns. You decide what to do." icon={CalendarDays}>
          <div className="mb-3 flex flex-wrap gap-2"><button onClick={generateDailyBrief} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"><RefreshCw className="mr-2 h-4 w-4" />Generate today’s brief</button></div>
          {!brief ? <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">Generate today’s brief to see what needs attention.</p> : (
            <div className="space-y-2 text-sm">
              <p className="text-lg font-black text-slate-950">{safeText(brief.headline, "Daily brief")}</p><Pill tone={brief.risk_level === "high" ? "red" : brief.risk_level === "medium" ? "amber" : "green"}>{safeText(brief.risk_level, "low")} risk</Pill>
              {["summary","money_summary","job_summary","quote_summary","invoice_summary","team_summary","automation_summary"].map((k)=><p key={k} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">{safeText(brief[k], "")}</p>)}
              <div>{safeArray(brief.recommended_actions).map((a,i)=><p key={`${i}-${a}`} className="mt-1 text-slate-700">• {a}</p>)}</div>
            </div>
          )}
        </Section>

        <Section title="Business Memory" subtitle="AI highlights patterns. You decide what to do." icon={Brain}>
          <div className="mb-3 flex flex-wrap gap-2"><button onClick={refreshBusinessMemory} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"><RefreshCw className="mr-2 h-4 w-4" />Refresh business memory</button></div>
          {!memory.length ? <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">No recurring patterns found yet.</p> : <div className="grid gap-3 md:grid-cols-2">{memory.map((m)=><div key={idOf(m,m.type)} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="font-black text-slate-950">{safeText(m.title,"Pattern")}</p><p className="text-xs font-semibold text-slate-500">{safeText(m.type,"")}</p><p className="mt-2 text-sm font-semibold text-slate-700">{safeText(m.description,"")}</p><p className="mt-2 text-xs text-slate-600">Confidence: {safeText(m.confidence,"medium")} · Evidence: {safeNumber(m.evidence_count,0)} · Last seen: {safeText(m.last_seen_at,"n/a")}</p><button onClick={()=>dismissMemory(m.id)} className="mt-3 inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Dismiss</button></div>)}</div>}
        </Section>
        <Section title="AI Team & Payroll Watchtower" subtitle="AI highlights team and payroll risks. It does not approve payroll, change rates, edit timesheets, or pay workers." icon={Users}>
          <div className="mb-3 flex flex-wrap gap-2"><button onClick={generateTeamPayroll} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"><RefreshCw className="mr-2 h-4 w-4" />Generate team/payroll watchtower</button></div>
          {!teamPayroll ? <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">No team or payroll risks found yet. Churvox will highlight setup, workload, timesheet and payroll review issues here.</p> : (
            <div className="space-y-3 text-sm">
              <p className="text-lg font-black text-slate-950">{safeText(teamPayroll.headline, "Team and payroll snapshot")}</p>
              <Pill tone={teamPayroll.risk_level === "high" ? "red" : teamPayroll.risk_level === "medium" ? "amber" : "green"}>{safeText(teamPayroll.risk_level, "low")} risk</Pill>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">{safeText(teamPayroll.summary, "")}</p>
              <div className="grid gap-2 md:grid-cols-4">{[
                ["Workers", teamPayroll.worker_count],["Active workers", teamPayroll.active_worker_count],["Missing rates", teamPayroll.missing_rate_count],["Missing regions", teamPayroll.missing_region_count],["Open timesheets", teamPayroll.open_timesheet_count],["Payroll warnings", teamPayroll.payroll_warning_count],
              ].map(([label,val]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="text-xl font-black text-slate-950">{safeNumber(val,0)}</p></div>)}</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-black uppercase text-slate-600">Worker setup</p>{safeArray(teamPayroll.worker_setup_issues).slice(0,4).map((i,idx)=><p key={idx} className="mt-1 text-slate-700">• {safeText(i.worker_name,"Worker")}: {safeArray(i.issues).join(", ")}</p>)}</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-black uppercase text-slate-600">Timesheet review</p>{safeArray(teamPayroll.timesheet_review_items).slice(0,4).map((i,idx)=><p key={idx} className="mt-1 text-slate-700">• {safeText(i.issue,"Review needed")}</p>)}</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-black uppercase text-slate-600">Payroll review</p>{safeArray(teamPayroll.payroll_review_items).slice(0,4).map((i,idx)=><p key={idx} className="mt-1 text-slate-700">• {safeText(i.type,"Issue")}: {safeNumber(i.count,0)}</p>)}</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-black uppercase text-slate-600">Recommended actions</p>{safeArray(teamPayroll.recommended_actions).map((i,idx)=><p key={idx} className="mt-1 text-slate-700">• {i}</p>)}</div>
              </div>
            </div>
          )}
        </Section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl p-5" style={darkPanelStyle}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black" style={glassStyle}><Bot className="h-4 w-4" /> Smart control tower</div><h2 className="mt-4 text-3xl font-black" style={{ color: "#ffffff" }}>{riskTone}</h2><p className="mt-2 text-sm font-semibold leading-6" style={{ color: "#dbeafe" }}>{smart.businessBrief}</p></div>
              <div className="rounded-3xl px-5 py-4 text-center" style={glassStyle}><p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: "#bfdbfe" }}>Risk</p><p className="text-5xl font-black" style={{ color: "#ffffff" }}>{smart.risk}</p><p className="text-xs font-black" style={{ color: "#dbeafe" }}>Can drop to {smart.afterRisk}</p></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Link to="/jobs" className="rounded-2xl p-3 hover:opacity-90" style={glassStyle}><Briefcase className="h-5 w-5" style={{ color: "#bfdbfe" }} /><p className="mt-2 text-2xl font-black" style={{ color: "#ffffff" }}>{smart.unassignedJobs.length}</p><p className="text-xs font-bold" style={{ color: "#dbeafe" }}>Unassigned</p></Link>
              <Link to="/invoices" className="rounded-2xl p-3 hover:opacity-90" style={glassStyle}><Receipt className="h-5 w-5" style={{ color: "#bfdbfe" }} /><p className="mt-2 text-2xl font-black" style={{ color: "#ffffff" }}>{smart.overdueInvoices.length}</p><p className="text-xs font-bold" style={{ color: "#dbeafe" }}>Overdue</p></Link>
              <Link to="/quotes" className="rounded-2xl p-3 hover:opacity-90" style={glassStyle}><FileText className="h-5 w-5" style={{ color: "#bfdbfe" }} /><p className="mt-2 text-2xl font-black" style={{ color: "#ffffff" }}>{smart.quoteFollowups.length}</p><p className="text-xs font-bold" style={{ color: "#dbeafe" }}>Quotes</p></Link>
              <Link to="/team" className="rounded-2xl p-3 hover:opacity-90" style={glassStyle}><Users className="h-5 w-5" style={{ color: "#bfdbfe" }} /><p className="mt-2 text-2xl font-black" style={{ color: "#ffffff" }}>{smart.workers.length}</p><p className="text-xs font-bold" style={{ color: "#dbeafe" }}>Team</p></Link>
            </div>
          </div>
          <Section title={`Why risk is ${smart.risk}`} icon={Target}><div className="space-y-2">{smart.riskItems.map((item) => <RiskItem key={item.label} {...item} />)}</div></Section>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard icon={Briefcase} label="Total jobs" value={smart.jobs.length} detail={`${smart.todayJobs.length} today`} to="/jobs" tone="blue" />
          <MetricCard icon={Users} label="Assigned" value={smart.assignedJobs.length} detail={`${smart.unassignedJobs.length} unassigned`} to="/jobs" tone="amber" />
          <MetricCard icon={CalendarDays} label="In progress" value={smart.inProgressJobs.length} detail="Active work" to="/schedule" tone="blue" />
          <MetricCard icon={CheckCircle2} label="Completed" value={smart.completedJobs.length} detail={`${smart.completedNoInvoice.length} not invoiced`} to="/jobs" tone="green" />
          <MetricCard icon={Receipt} label="Overdue" value={smart.overdueInvoices.length} detail={money(smart.overdueValue)} to="/invoices" tone="red" />
          <MetricCard icon={FileText} label="Quotes" value={smart.quoteFollowups.length} detail={money(smart.quoteValue)} to="/quotes" tone="slate" />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <Section title="Ranked AI priority queue" subtitle="Sorted by business impact. AI drafts and suggests — you approve." icon={Sparkles}>
            <div className="space-y-3">{smart.actions.map((action, index) => <ActionCard key={`${action.title}-${index}`} action={action} rank={index + 1} reviewed={Boolean(reviewed[action.title])} onToggleReviewed={() => setReviewed((prev) => ({ ...prev, [action.title]: !prev[action.title] }))} setCopied={setCopied} />)}</div>
          </Section>
          <div className="space-y-4">
            <Section title="Today’s job pulse" icon={CalendarDays}><div className="space-y-2">{smart.todayJobs.slice(0, 5).map((job, index) => <Link key={idOf(job, index)} to={idOf(job) ? `/jobs/${idOf(job)}` : "/jobs"} className="block rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"><p className="truncate text-sm font-black text-slate-950">{jobTitle(job)}</p><p className="mt-1 truncate text-xs font-semibold text-slate-500">{safeText(job.client_name || job.customer_name || job.address, "No details")}</p></Link>)}{!smart.todayJobs.length && <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-600">No jobs scheduled today.</p>}</div></Section>
            <Section title="Money waiting" icon={DollarSign}><div className="grid gap-2"><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-black uppercase text-slate-500">Quote value</p><p className="text-xl font-black text-slate-950">{money(smart.quoteValue)}</p></div><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-black uppercase text-slate-500">Unpaid invoices</p><p className="text-xl font-black text-slate-950">{money(smart.unpaidValue)}</p></div><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-black uppercase text-slate-500">Draft / uninvoiced</p><p className="text-xl font-black text-slate-950">{money(smart.draftValue + smart.uninvoicedValue)}</p></div></div></Section>
          </div>
        </section>

        <Section title="AI Action Queue" subtitle="AI suggests. You approve. Draft only. No payroll, MYOB, pricing, invoice status, or customer messages are changed without approval." icon={Bot}>
          <div className="mb-3 flex flex-wrap gap-2">
            <button onClick={refreshAiActions} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"><RefreshCw className="mr-2 h-4 w-4" />Generate actions</button>
          </div>
          {!smart.aiActions.length ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">No urgent AI actions. Churvox will flag work, invoices, quotes, team and automation risks here.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {smart.aiActions.map((action) => (
                <AIQueueActionCard
                  key={idOf(action, action.title)}
                  action={action}
                  onApprove={() => updateAiAction(idOf(action), "approve", "Approved for review/action.")}
                  onSnooze={() => updateAiAction(idOf(action), "snooze", "Action snoozed for later review.")}
                  onDismiss={() => updateAiAction(idOf(action), "dismiss", "Action dismissed.")}
                  onComplete={() => updateAiAction(idOf(action), "complete", "Action marked done.")}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="AI automation suggestions" subtitle="Practical rules that save admin without auto-sending or changing records without approval." icon={Lightbulb} dark><div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{smart.automationIdeas.map((idea) => <AutomationCard key={idea.title} {...idea} />)}</div></Section>
        <Section title="AI Automation Builder" subtitle="AI suggests automation. You approve before anything runs." icon={Zap}>
          <div className="mb-3 flex flex-wrap gap-2">
            <button onClick={generateAutomationSuggestions} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"><RefreshCw className="mr-2 h-4 w-4" />Generate automation ideas</button>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">Draft rule only. Nothing sends automatically.</p>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">No payroll, MYOB, pricing or invoice payment changes happen without approval.</p>
          </div>
          {automationNotice ? <p className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">{automationNotice}</p> : null}
          {!smart.automationSuggestions.length ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">No automation suggestions yet. Churvox will look for repeat admin work, follow-ups, invoice reminders and job workflow risks.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {smart.automationSuggestions.map((item) => (
                <div key={idOf(item, item.title)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-950">{safeText(item.title, "Automation suggestion")}</p><Pill tone={item.priority === "high" ? "red" : item.priority === "low" ? "green" : "amber"}>{safeText(item.priority, "medium")}</Pill><Pill tone={item.confidence === "high" ? "green" : item.confidence === "low" ? "amber" : "blue"}>{safeText(item.confidence, "medium")}</Pill></div>
                  <p className="mt-2 text-sm font-semibold text-slate-600">{safeText(item.description, "")}</p>
                  <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"><strong>Trigger:</strong> {safeText(item.trigger_type, "n/a")}</p>
                  <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"><strong>Action:</strong> {safeText(item.action_type, "n/a")}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-600"><strong>Reason:</strong> {safeText(item.reason, "AI suggests automation. You approve before anything runs.")}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600"><strong>Impact:</strong> {safeText(item.impact, "")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => updateAutomationSuggestion(item.id, "approve", "Suggestion approved. Draft rule only. Nothing sends automatically.")} className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100">Approve draft rule</button>
                    <button type="button" onClick={() => updateAutomationSuggestion(item.id, "snooze", "Suggestion snoozed.")} className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">Snooze</button>
                    <button type="button" onClick={() => updateAutomationSuggestion(item.id, "dismiss", "Suggestion dismissed.")} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Dismiss</button>
                    <Link to="/automation" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700">Open Automation</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="AI safety guardrails" icon={ShieldCheck}><div className="grid grid-cols-1 gap-3 md:grid-cols-3"><GuardrailCard>AI suggests, drafts, summarises and warns.</GuardrailCard><GuardrailCard>You approve customer messages, invoices, pricing, payroll and MYOB changes.</GuardrailCard><GuardrailCard>Worker and payroll roles stay locked down.</GuardrailCard></div></Section>
      </div>
    </Layout>
  );
}
