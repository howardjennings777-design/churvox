import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { ShieldCheck, Bot, Briefcase, FileText, Receipt, Users, Sparkles } from "lucide-react";

function Card({ title, text, to, icon: Icon }) {
  return (
    <Link to={to} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">{Icon ? <Icon className="h-5 w-5" /> : null}</div>
        <div>
          <h3 className="font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">{text}</p>
        </div>
      </div>
    </Link>
  );
}

function extractList(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getItemId(item) {
  return String(item?.id || item?._id || item?.invoice_id || item?.quote_id || item?.job_id || "");
}

function getCustomerName(item) {
  return item?.customer_name || item?.client_name || item?.customer?.name || item?.client?.name || item?.name || "Customer";
}

export default function SafeAIAssistantPage() {
  const { get } = useApi();
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [copiedDraftId, setCopiedDraftId] = useState("");

  useEffect(() => {
    let active = true;
    async function loadData() {
      const [jobsRes, quotesRes, invoicesRes, workersRes] = await Promise.allSettled([
        get("/jobs"),
        get("/quotes"),
        get("/invoices"),
        get("/workers"),
      ]);

      if (!active) return;

      if (jobsRes.status === "fulfilled" && jobsRes.value?.success) setJobs(extractList(jobsRes.value.data, ["jobs", "items", "data"]));
      if (quotesRes.status === "fulfilled" && quotesRes.value?.success) setQuotes(extractList(quotesRes.value.data, ["quotes", "items", "data"]));
      if (invoicesRes.status === "fulfilled" && invoicesRes.value?.success) setInvoices(extractList(invoicesRes.value.data, ["invoices", "items", "data"]));
      if (workersRes.status === "fulfilled" && workersRes.value?.success) setWorkers(extractList(workersRes.value.data, ["workers", "items", "data"]));
    }

    loadData();
    return () => { active = false; };
  }, [get]);

  const actionCards = useMemo(() => {
    const unassignedJobs = jobs.filter((job) => {
      const hasWorker = Boolean(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || job?.assigned_worker_name || job?.worker_name);
      return !hasWorker;
    });

    const uninvoicedCompletedJobs = jobs.filter((job) => {
      const status = normalize(job?.status);
      const invoiced = Boolean(job?.invoice_id || job?.invoiced_at || job?.is_invoiced || job?.invoice_number);
      return status === "completed" && !invoiced;
    });

    const unpaidInvoices = invoices.filter((invoice) => {
      const status = normalize(invoice?.status || invoice?.payment_status);
      const paid = Boolean(invoice?.paid_at || invoice?.date_paid || invoice?.is_paid || status === "paid");
      return !paid;
    });

    const now = new Date();
    const overdueInvoices = unpaidInvoices.filter((invoice) => {
      const dueRaw = invoice?.due_date || invoice?.dueDate;
      if (!dueRaw) return false;
      const dueDate = new Date(dueRaw);
      if (Number.isNaN(dueDate.getTime())) return false;
      return dueDate < now;
    });

    const pendingQuotes = quotes.filter((quote) => {
      const status = normalize(quote?.status);
      return ["pending", "open", "sent", "draft"].includes(status);
    });

    return [
      {
        key: "unassigned-jobs",
        title: "Assign unassigned jobs",
        reason: `${unassignedJobs.length} job${unassignedJobs.length === 1 ? "" : "s"} still need a worker assignment.`,
        priority: "high",
        to: "/jobs",
      },
      {
        key: "completed-uninvoiced",
        title: "Invoice completed jobs",
        reason: `${uninvoicedCompletedJobs.length} completed job${uninvoicedCompletedJobs.length === 1 ? "" : "s"} are not invoiced yet.`,
        priority: "high",
        to: "/jobs",
      },
      {
        key: "overdue-invoices",
        title: "Follow up overdue invoices",
        reason: `${overdueInvoices.length} invoice${overdueInvoices.length === 1 ? "" : "s"} are overdue and still unpaid.`,
        priority: "high",
        to: "/invoices",
      },
      {
        key: "unpaid-invoices",
        title: "Review unpaid invoices",
        reason: `${unpaidInvoices.length} invoice${unpaidInvoices.length === 1 ? "" : "s"} are currently unpaid.`,
        priority: "medium",
        to: "/invoices",
      },
      {
        key: "pending-quotes",
        title: "Review open quotes",
        reason: `${pendingQuotes.length} quote${pendingQuotes.length === 1 ? "" : "s"} are open or pending customer action.`,
        priority: "low",
        to: "/quotes",
      },
    ].filter((item) => {
      const count = Number.parseInt(item.reason, 10);
      return Number.isFinite(count) && count > 0;
    });
  }, [jobs, quotes, invoices]);

  const draftCards = useMemo(() => {
    const now = new Date();
    const drafts = [];

    const overdueInvoice = invoices.find((invoice) => {
      const status = normalize(invoice?.status || invoice?.payment_status);
      const paid = Boolean(invoice?.paid_at || invoice?.date_paid || invoice?.is_paid || status === "paid");
      if (paid) return false;
      const dueRaw = invoice?.due_date || invoice?.dueDate;
      const dueDate = dueRaw ? new Date(dueRaw) : null;
      return dueDate && !Number.isNaN(dueDate.getTime()) && dueDate < now;
    });

    if (overdueInvoice) {
      drafts.push({
        id: `invoice-${getItemId(overdueInvoice) || "overdue"}`,
        type: "Invoice reminder draft",
        related: `${getCustomerName(overdueInvoice)} • Invoice ${overdueInvoice?.invoice_number || getItemId(overdueInvoice) || "N/A"}`,
        text: `Hi ${getCustomerName(overdueInvoice)}, this is a friendly reminder that invoice ${overdueInvoice?.invoice_number || ""} is overdue. Please review and let us know if you need a copy or payment details.`,
      });
    }

    const followUpQuote = quotes.find((quote) => ["pending", "open", "sent"].includes(normalize(quote?.status)));
    if (followUpQuote) {
      drafts.push({
        id: `quote-${getItemId(followUpQuote) || "follow-up"}`,
        type: "Quote follow-up draft",
        related: `${getCustomerName(followUpQuote)} • Quote ${followUpQuote?.quote_number || getItemId(followUpQuote) || "N/A"}`,
        text: `Hi ${getCustomerName(followUpQuote)}, just checking in on quote ${followUpQuote?.quote_number || ""}. Please let us know if you would like any changes or if you're ready for us to book the work.`,
      });
    }

    const updateJob = jobs.find((job) => {
      const status = normalize(job?.status);
      const hasWorker = Boolean(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || job?.assigned_worker_name || job?.worker_name);
      return ["overdue", "paused"].includes(status) || !hasWorker;
    });
    if (updateJob) {
      drafts.push({
        id: `job-update-${getItemId(updateJob) || "update"}`,
        type: "Customer job update draft",
        related: `${getCustomerName(updateJob)} • Job ${updateJob?.job_number || getItemId(updateJob) || "N/A"}`,
        text: `Hi ${getCustomerName(updateJob)}, quick update on job ${updateJob?.job_number || ""}: we're reviewing scheduling and next steps now and will confirm the updated timeline shortly.`,
      });
    }

    const unassignedJob = jobs.find((job) => {
      const hasWorker = Boolean(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || job?.assigned_worker_name || job?.worker_name);
      return !hasWorker;
    });
    if (unassignedJob) {
      drafts.push({
        id: `worker-${getItemId(unassignedJob) || "instruction"}`,
        type: "Worker instruction draft",
        related: `${getCustomerName(unassignedJob)} • Job ${unassignedJob?.job_number || getItemId(unassignedJob) || "N/A"}`,
        text: `Team, please review job ${unassignedJob?.job_number || ""} for ${getCustomerName(unassignedJob)} and confirm availability so we can assign the best worker and schedule safely.`,
      });
    }

    return drafts;
  }, [jobs, quotes, invoices]);

  const automationSuggestions = useMemo(() => {
    const now = new Date();
    const completedNotInvoicedCount = jobs.filter((job) => {
      const status = normalize(job?.status);
      const invoiced = Boolean(job?.invoice_id || job?.invoiced_at || job?.is_invoiced || job?.invoice_number);
      return status === "completed" && !invoiced;
    }).length;

    const unassignedJobCount = jobs.filter((job) => {
      const hasWorker = Boolean(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || job?.assigned_worker_name || job?.worker_name);
      return !hasWorker;
    }).length;

    const quoteFollowUpCount = quotes.filter((quote) => ["pending", "open"].includes(normalize(quote?.status))).length;
    const overdueOrUnpaidCount = invoices.filter((invoice) => {
      const status = normalize(invoice?.status || invoice?.payment_status);
      const isPaid = Boolean(invoice?.paid_at || invoice?.date_paid || invoice?.is_paid || status === "paid");
      if (isPaid) return false;
      const dueRaw = invoice?.due_date || invoice?.dueDate;
      const dueDate = dueRaw ? new Date(dueRaw) : null;
      const isOverdue = dueDate && !Number.isNaN(dueDate.getTime()) && dueDate < now;
      return isOverdue || ["overdue", "unpaid"].includes(status);
    }).length;

    const workersMissingSetupCount = workers.filter((worker) => {
      const missingPhone = !String(worker?.phone || worker?.mobile || "").trim();
      const missingRole = !String(worker?.role || worker?.position || "").trim();
      return missingPhone || missingRole;
    }).length;

    return [
      quoteFollowUpCount > 0 ? {
        key: "quote-follow-up",
        title: "Quote follow-up workflow",
        trigger: `${quoteFollowUpCount} quote${quoteFollowUpCount === 1 ? "" : "s"} are pending/open.`,
        suggestedAction: "Create a follow-up automation draft for owner approval.",
        reason: "Fast follow-up can improve win rate without manual tracking.",
        priority: "medium",
      } : null,
      overdueOrUnpaidCount > 0 ? {
        key: "invoice-reminder",
        title: "Invoice reminder workflow",
        trigger: `${overdueOrUnpaidCount} invoice${overdueOrUnpaidCount === 1 ? "" : "s"} are overdue/unpaid.`,
        suggestedAction: "Prepare reminder message drafts in automation for review.",
        reason: "Consistent reminders reduce late payments.",
        priority: "high",
      } : null,
      completedNotInvoicedCount > 0 ? {
        key: "completed-not-invoiced",
        title: "Completed job invoicing workflow",
        trigger: `${completedNotInvoicedCount} completed job${completedNotInvoicedCount === 1 ? "" : "s"} have no invoice.`,
        suggestedAction: "Add a draft task to prompt invoice creation after completion.",
        reason: "Billing quickly improves cash flow and reduces missed revenue.",
        priority: "high",
      } : null,
      unassignedJobCount > 0 ? {
        key: "unassigned-alert",
        title: "Unassigned job alert workflow",
        trigger: `${unassignedJobCount} job${unassignedJobCount === 1 ? "" : "s"} are unassigned.`,
        suggestedAction: "Draft an owner/manager assignment alert rule for approval.",
        reason: "Unassigned jobs can delay service and customer updates.",
        priority: "medium",
      } : null,
      workers.length && workersMissingSetupCount > 0 ? {
        key: "team-cleanup",
        title: "Team setup cleanup workflow",
        trigger: `${workersMissingSetupCount} worker${workersMissingSetupCount === 1 ? "" : "s"} appear to have incomplete setup.`,
        suggestedAction: "Create a weekly team-data cleanup task draft.",
        reason: "Complete worker profiles reduce scheduling and payroll friction.",
        priority: "low",
      } : null,
    ].filter(Boolean);
  }, [jobs, quotes, invoices, workers]);

  const dailyBrief = useMemo(() => {
    const now = new Date();
    const todayLabel = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    const openJobs = jobs.filter((job) => !["completed", "cancelled", "canceled"].includes(normalize(job?.status)));
    const unassignedJobs = jobs.filter((job) => {
      const hasWorker = Boolean(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || job?.assigned_worker_name || job?.worker_name);
      return !hasWorker;
    });
    const stuckJobs = jobs.filter((job) => ["paused", "stuck", "overdue", "on hold", "on-hold"].includes(normalize(job?.status)));
    const completedNotInvoicedJobs = jobs.filter((job) => normalize(job?.status) === "completed" && !Boolean(job?.invoice_id || job?.invoiced_at || job?.is_invoiced || job?.invoice_number));
    const openQuotes = quotes.filter((quote) => ["pending", "open", "sent", "draft"].includes(normalize(quote?.status)));
    const acceptedQuotes = quotes.filter((quote) => ["accepted", "approved", "won"].includes(normalize(quote?.status)));

    const unpaidInvoices = invoices.filter((invoice) => {
      const status = normalize(invoice?.status || invoice?.payment_status);
      return !(invoice?.paid_at || invoice?.date_paid || invoice?.is_paid || status === "paid");
    });
    const overdueInvoices = unpaidInvoices.filter((invoice) => {
      const dueDate = new Date(invoice?.due_date || invoice?.dueDate || "");
      return !Number.isNaN(dueDate.getTime()) && dueDate < now;
    });

    const riskLevel = overdueInvoices.length || unassignedJobs.length || completedNotInvoicedJobs.length || stuckJobs.length
      ? "high"
      : (openQuotes.length || unpaidInvoices.length || openJobs.length ? "medium" : "low");

    const recommendedActions = [
      overdueInvoices.length ? { label: `Follow up ${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"}`, to: "/invoices" } : null,
      unassignedJobs.length ? { label: `Assign ${unassignedJobs.length} unassigned job${unassignedJobs.length === 1 ? "" : "s"}`, to: "/jobs" } : null,
      completedNotInvoicedJobs.length ? { label: `Create invoices for ${completedNotInvoicedJobs.length} completed job${completedNotInvoicedJobs.length === 1 ? "" : "s"}`, to: "/jobs" } : null,
      openQuotes.length ? { label: `Review ${openQuotes.length} open quote${openQuotes.length === 1 ? "" : "s"}`, to: "/quotes" } : null,
      stuckJobs.length ? { label: `Unblock ${stuckJobs.length} paused/stuck job${stuckJobs.length === 1 ? "" : "s"}`, to: "/jobs" } : null,
      workers.length ? { label: "Check team capacity and allocations", to: "/team" } : null,
      { label: "Set up safe reminders in automation", to: "/automation" },
    ].filter(Boolean).slice(0, 6);

    while (recommendedActions.length < 3) {
      recommendedActions.push({ label: "Review active work items", to: "/jobs" });
    }

    return {
      headline: `AI Daily Brief • ${todayLabel}`,
      todaysFocus: riskLevel === "high" ? "Stabilise urgent risks first, then clear backlog."
        : riskLevel === "medium" ? "Keep momentum on open work and collections."
          : "Maintain consistency and monitor new activity.",
      moneySummary: `${invoices.length} invoices total • ${unpaidInvoices.length} unpaid • ${overdueInvoices.length} overdue.`,
      jobSummary: `${jobs.length} jobs total • ${openJobs.length} open • ${unassignedJobs.length} unassigned • ${completedNotInvoicedJobs.length} completed not invoiced.`,
      quoteSummary: `${quotes.length} quotes total • ${openQuotes.length} open/pending • ${acceptedQuotes.length} accepted.`,
      invoiceSummary: `${unpaidInvoices.length} unpaid invoice${unpaidInvoices.length === 1 ? "" : "s"} and ${overdueInvoices.length} overdue.`,
      teamSummary: workers.length ? `${workers.length} worker${workers.length === 1 ? "" : "s"} available in current team list.` : "",
      riskLevel,
      recommendedActions,
    };
  }, [jobs, quotes, invoices, workers]);

  const handleCopyDraft = async (draftId, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDraftId(draftId);
      window.setTimeout(() => setCopiedDraftId(""), 2500);
    } catch (error) {
      setCopiedDraftId("");
    }
  };

  const priorityClasses = {
    high: "border-red-200 bg-red-50 text-red-700",
    medium: "border-amber-200 bg-amber-50 text-amber-700",
    low: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <Layout>
      <div className="cx-page space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-blue-50 to-slate-50 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Smart Hub safety rebuild</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">AI Business Assistant</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Churvox is back in safe mode while the broken Financial Radar build is removed. Real Ask Churvox AI remains separate and can be restored after the site is stable.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card title="Jobs" text="Open jobs, assigned work and job details." to="/jobs" icon={Briefcase} />
          <Card title="Quotes" text="Open quotes and follow-ups." to="/quotes" icon={FileText} />
          <Card title="Invoices" text="Invoices, unpaid work and customer billing." to="/invoices" icon={Receipt} />
          <Card title="Team" text="Workers, roles and team setup." to="/team" icon={Users} />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Sparkles className="h-5 w-5 text-blue-600" />AI Daily Brief</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">AI highlights patterns. You decide what to do.</p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-900">{dailyBrief.headline}</p>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${priorityClasses[dailyBrief.riskLevel] || priorityClasses.low}`}>
                Risk: {dailyBrief.riskLevel}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-700">{dailyBrief.todaysFocus}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <p className="text-sm font-semibold text-slate-700"><span className="font-black text-slate-900">Money:</span> {dailyBrief.moneySummary}</p>
              <p className="text-sm font-semibold text-slate-700"><span className="font-black text-slate-900">Jobs:</span> {dailyBrief.jobSummary}</p>
              <p className="text-sm font-semibold text-slate-700"><span className="font-black text-slate-900">Quotes:</span> {dailyBrief.quoteSummary}</p>
              <p className="text-sm font-semibold text-slate-700"><span className="font-black text-slate-900">Invoices:</span> {dailyBrief.invoiceSummary}</p>
              {dailyBrief.teamSummary ? (
                <p className="text-sm font-semibold text-slate-700 md:col-span-2"><span className="font-black text-slate-900">Team:</span> {dailyBrief.teamSummary}</p>
              ) : null}
            </div>
            <div className="mt-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Recommended actions</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dailyBrief.recommendedActions.map((action, idx) => (
                  <Link key={`${action.to}-${idx}`} to={action.to} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Sparkles className="h-5 w-5 text-blue-600" />AI Automation Suggestions</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">AI suggests automation. You approve before anything runs.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {automationSuggestions.length ? automationSuggestions.map((suggestion) => (
              <div key={suggestion.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-slate-900">{suggestion.title}</h3>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${priorityClasses[suggestion.priority] || priorityClasses.low}`}>
                    {suggestion.priority}
                  </span>
                </div>
                <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">Trigger</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{suggestion.trigger}</p>
                <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">Suggested action</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{suggestion.suggestedAction}</p>
                <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">Reason</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{suggestion.reason}</p>
                <Link to="/automation" className="mt-3 inline-flex text-sm font-black text-blue-700 hover:text-blue-800">
                  Open Automation →
                </Link>
              </div>
            )) : <p className="text-sm font-semibold text-slate-500">No automation suggestions from current Jobs, Quotes, Invoices, and Team data.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Sparkles className="h-5 w-5 text-blue-600" />AI Action Queue</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">AI suggests. You approve. Nothing is changed automatically.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {actionCards.length ? actionCards.map((action) => (
              <div key={action.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-slate-900">{action.title}</h3>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${priorityClasses[action.priority] || priorityClasses.low}`}>
                    {action.priority}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-600">{action.reason}</p>
                <Link to={action.to} className="mt-3 inline-flex text-sm font-black text-blue-700 hover:text-blue-800">
                  Go to {action.to.replace("/", "") || "page"} →
                </Link>
              </div>
            )) : (
              <p className="text-sm font-semibold text-slate-500">No urgent actions right now. Check Jobs, Quotes, and Invoices for updates.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Bot className="h-5 w-5 text-blue-600" />AI Draft Centre</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">AI drafts only. Nothing is sent without your approval.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {draftCards.length ? draftCards.map((draft) => (
              <div key={draft.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">{draft.type}</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{draft.related}</p>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{draft.text}</p>
                <div className="mt-3 flex items-center gap-3">
                  <button type="button" onClick={() => handleCopyDraft(draft.id, draft.text)} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-blue-700 hover:bg-blue-100">
                    Copy
                  </button>
                  {copiedDraftId === draft.id ? <span className="text-xs font-black text-emerald-700">Draft copied. Review before sending.</span> : null}
                </div>
              </div>
            )) : <p className="text-sm font-semibold text-slate-500">No draft suggestions available from current Jobs, Quotes, and Invoices data.</p>}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Bot className="h-5 w-5 text-blue-600" />AI status</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              The Financial Radar page code caused a blank screen, so this safe Smart Hub is active to keep the app usable.
            </p>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-emerald-900"><ShieldCheck className="h-5 w-5" />AI guardrails</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
              AI suggests. You approve. It does not send customer messages, approve payroll, change pricing, mark invoices paid, or sync MYOB automatically.
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}
