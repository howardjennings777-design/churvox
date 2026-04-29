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

export default function SafeAIAssistantPage() {
  const { get } = useApi();
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadData() {
      const [jobsRes, quotesRes, invoicesRes] = await Promise.all([
        get("/jobs"),
        get("/quotes"),
        get("/invoices"),
      ]);

      if (!active) return;

      if (jobsRes?.success) setJobs(extractList(jobsRes.data, ["jobs", "items", "data"]));
      if (quotesRes?.success) setQuotes(extractList(quotesRes.data, ["quotes", "items", "data"]));
      if (invoicesRes?.success) setInvoices(extractList(invoicesRes.data, ["invoices", "items", "data"]));
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
