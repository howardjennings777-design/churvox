import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const money = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) && num > 0 ? `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0";
};

const listFrom = (res) => {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of ["actions", "slips", "jobs", "quotes", "invoices", "workers", "team", "items", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

const idOf = (item) => {
  const raw = item?.id || item?._id || item?.job_id || item?.quote_id || item?.invoice_id || item?.user_id || "";
  return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || "");
};

const first = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
const lc = (value) => String(value || "").toLowerCase();
const titleOf = (item) => first(item?.title, item?.job_title, item?.job_name, item?.quote_number, item?.invoice_number, item?.customer_name, item?.client_name, item?.name, "Prepared action");
const statusOf = (item) => String(first(item?.status, item?.job_status, item?.quote_status, item?.invoice_status, "ready")).replaceAll("_", " ");
const workerName = (job) => first(job?.assigned_worker_name, job?.worker_name, job?.assigned_to_name, job?.assigned_worker?.name, job?.worker?.name, job?.assigned_to, "Unassigned");
const isCompleted = (job) => lc(statusOf(job)).includes("complete") || Boolean(job?.completed_at);
const isCancelled = (job) => lc(statusOf(job)).includes("cancel") || lc(statusOf(job)).includes("archiv");
const isActive = (job) => ["progress", "started", "active", "on site", "timer"].some((term) => lc(statusOf(job)).includes(term));
const isToday = (job) => {
  const raw = first(job?.scheduled_at, job?.scheduled_date, job?.date, job?.start_time, job?.job_date);
  if (!raw) return false;
  const d = new Date(raw);
  return !Number.isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
};
const invoiceAmount = (invoice) => Number(first(invoice?.total, invoice?.amount_due, invoice?.amount, invoice?.subtotal, invoice?.price, 0)) || 0;

function buildActions({ jobs, invoices, quotes, workers, aiActions }) {
  const prepared = [];
  aiActions.slice(0, 4).forEach((action) => prepared.push({
    id: `ai-${idOf(action) || titleOf(action)}`,
    type: "ai",
    title: titleOf(action),
    meta: action?.summary || action?.reason || "AI prepared this owner action.",
    status: statusOf(action),
    record: action,
    href: "/ai-operator",
  }));

  jobs.filter((job) => workerName(job) === "Unassigned" && !isCompleted(job) && !isCancelled(job)).slice(0, 4).forEach((job) => {
    const worker = workers.find((w) => !lc(statusOf(w)).includes("busy") && !lc(statusOf(w)).includes("inactive"));
    prepared.push({
      id: `assign-${idOf(job)}`,
      type: "assign_job",
      title: `Assign ${titleOf(job)}`,
      meta: worker ? `Suggested worker: ${first(worker.name, worker.full_name, worker.email)}. Reason: available or not marked busy.` : "No available worker found yet. Open Team to invite or activate crew.",
      status: worker ? "ready to assign" : "needs worker",
      record: job,
      worker,
      href: idOf(job) ? `/jobs/${idOf(job)}` : "/jobs",
    });
  });

  jobs.filter((job) => isCompleted(job) && !first(job?.invoice_id, job?.invoice_number, job?.invoice_status)).slice(0, 4).forEach((job) => prepared.push({
    id: `invoice-${idOf(job)}`,
    type: "draft_invoice",
    title: `Draft invoice for ${titleOf(job)}`,
    meta: `${first(job?.client_name, job?.customer_name, "Customer")} · ${money(first(job?.price, job?.total, job?.amount, 0))}`,
    status: "ready to draft",
    record: job,
    href: "/invoices/new",
  }));

  invoices.filter((invoice) => lc(statusOf(invoice)).includes("overdue") || Number(invoice?.days_overdue || 0) > 0).slice(0, 4).forEach((invoice) => prepared.push({
    id: `reminder-${idOf(invoice)}`,
    type: "payment_reminder",
    title: `Payment reminder for ${first(invoice?.client_name, invoice?.customer_name, "customer")}`,
    meta: `${money(invoiceAmount(invoice))} unpaid. Reminder stays approval-first before sending.`,
    status: "reminder prepared",
    record: invoice,
    href: idOf(invoice) ? `/invoices/${idOf(invoice)}` : "/invoices",
  }));

  quotes.filter((quote) => ["sent", "follow", "pending", "draft"].some((term) => lc(statusOf(quote)).includes(term))).slice(0, 4).forEach((quote) => prepared.push({
    id: `quote-${idOf(quote)}`,
    type: "quote_follow_up",
    title: `Follow up quote ${titleOf(quote)}`,
    meta: `${first(quote?.client_name, quote?.customer_name, "Customer")} · Churvox prepared a follow-up prompt.`,
    status: "follow-up ready",
    record: quote,
    href: idOf(quote) ? `/quotes/${idOf(quote)}` : "/quotes",
  }));

  return prepared;
}

function Tile({ label, value, text, to }) {
  return (
    <Link to={to || "/dashboard"} className="rounded-[26px] border border-slate-200 bg-white p-5 text-slate-950 no-underline shadow-[0_14px_40px_rgba(15,23,42,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(15,23,42,.10)]">
      <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-4xl font-black tracking-[-.07em]">{value}</div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{text}</p>
    </Link>
  );
}

function saveLocalApproval(action) {
  try {
    const key = "churvox_approved_action_log";
    const current = JSON.parse(localStorage.getItem(key) || "[]");
    current.unshift({ id: action.id, type: action.type, title: action.title, at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(current.slice(0, 100)));
  } catch (err) {}
}

function ActionSlip({ action, onClose, onApprove, approving }) {
  if (!action) return null;
  const details = [
    ["Action type", action.type.replaceAll("_", " ")],
    ["Status", action.status],
    ["Customer", first(action.record?.client_name, action.record?.customer_name, "Not saved")],
    ["Worker", action.worker ? first(action.worker.name, action.worker.full_name, action.worker.email) : workerName(action.record)],
    ["Address", first(action.record?.address, action.record?.site_address, action.record?.street_address, "Not saved")],
    ["Amount", money(first(action.record?.price, action.record?.total, action.record?.amount, action.record?.subtotal, 0))],
    ["Reason", action.meta],
  ];

  return (
    <div className="fixed inset-0 z-[2147483647] overflow-y-auto bg-slate-950/90 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
      <section className="mx-auto flex min-h-[calc(100dvh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-slate-950 shadow-2xl md:min-h-[calc(100dvh-48px)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7">
          <div>
            <div className="inline-flex rounded-full bg-orange-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-orange-200">Owner approval slip</div>
            <h2 className="mt-4 text-4xl font-black leading-[.95] tracking-[-.07em] md:text-6xl">{action.title}</h2>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300">{action.meta}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button>
        </header>

        <main className="grid flex-1 gap-5 p-5 md:grid-cols-[1.1fr_.9fr] md:p-7">
          <section className="rounded-[28px] border border-white/10 bg-white/[.04] p-5">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">Prepared details</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[.16em] text-orange-300">{label}</div>
                  <div className="mt-2 text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div>
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-[28px] border border-white/10 bg-white/[.04] p-5">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Decision</div>
            <h3 className="mt-2 text-3xl font-black tracking-[-.06em]">Approve only after review.</h3>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-300">Churvox will try the real action first. If that endpoint is not ready yet, it records the approval locally and keeps you in control.</p>
            <div className="mt-5 grid gap-3">
              <button type="button" onClick={() => onApprove(action)} disabled={approving} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-70">{approving ? "Approving…" : "Approve action"}</button>
              <Link to={action.href || "/dashboard"} onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open related page</Link>
              <button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to Command</button>
            </div>
          </aside>
        </main>
      </section>
    </div>
  );
}

function CommandDeskQueuePage() {
  const { get, post, patch } = useApi();
  const [jobs, setJobs] = React.useState([]);
  const [invoices, setInvoices] = React.useState([]);
  const [quotes, setQuotes] = React.useState([]);
  const [workers, setWorkers] = React.useState([]);
  const [aiActions, setAiActions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeAction, setActiveAction] = React.useState(null);
  const [approving, setApproving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [jobsRes, invoicesRes, quotesRes, workersRes, aiRes] = await Promise.allSettled([
      get("/jobs"), get("/invoices"), get("/quotes"), get("/team/workers"), get("/ai/operator/slips"),
    ]);
    setJobs(jobsRes.status === "fulfilled" ? listFrom(jobsRes.value) : []);
    setInvoices(invoicesRes.status === "fulfilled" ? listFrom(invoicesRes.value) : []);
    setQuotes(quotesRes.status === "fulfilled" ? listFrom(quotesRes.value) : []);
    setWorkers(workersRes.status === "fulfilled" ? listFrom(workersRes.value) : []);
    setAiActions(aiRes.status === "fulfilled" ? listFrom(aiRes.value) : []);
    setLoading(false);
  }, [get]);

  React.useEffect(() => { load(); }, [load]);

  const actions = React.useMemo(() => buildActions({ jobs, invoices, quotes, workers, aiActions }), [jobs, invoices, quotes, workers, aiActions]);
  const todayJobs = jobs.filter(isToday);
  const activeJobs = jobs.filter(isActive);
  const completedReady = jobs.filter((job) => isCompleted(job) && !first(job?.invoice_id, job?.invoice_number, job?.invoice_status));
  const overdueInvoices = invoices.filter((invoice) => lc(statusOf(invoice)).includes("overdue") || Number(invoice?.days_overdue || 0) > 0);
  const outstanding = invoices.filter((invoice) => !lc(statusOf(invoice)).includes("paid")).reduce((sum, invoice) => sum + invoiceAmount(invoice), 0);

  const approveAction = async (action) => {
    setApproving(true);
    let res = null;
    const recordId = idOf(action.record);

    if (action.type === "assign_job" && recordId && action.worker && idOf(action.worker)) {
      res = await post(`/jobs/${recordId}/assign`, { worker_id: idOf(action.worker) });
    } else if (action.type === "draft_invoice" && recordId) {
      const job = action.record || {};
      res = await post("/invoices", {
        job_id: recordId,
        client_id: first(job.client_id, job.customer_id, ""),
        customer_name: first(job.client_name, job.customer_name, "Customer"),
        customer_email: first(job.customer_email, job.client_email, ""),
        address: first(job.address, job.site_address, ""),
        description: `Work completed: ${titleOf(job)}. ${first(job.notes, "Photos and job notes ready for owner review.")}`,
        subtotal: Number(first(job.price, job.total, job.amount, 0)) || 0,
        notes: "Prepared by Churvox AI Operator approval queue.",
      });
    } else if (action.type === "payment_reminder" && recordId) {
      res = await patch(`/invoices/${recordId}`, { notes: `Payment reminder approved ${new Date().toLocaleString()}. Owner still controls sending.` });
    } else if (action.type === "quote_follow_up" && recordId) {
      res = await patch(`/quotes/${recordId}`, { notes: `Quote follow-up approved ${new Date().toLocaleString()}. Owner still controls sending.` });
    } else {
      res = await post("/ai/operator/approve", { action_id: action.id, type: action.type, record_id: recordId, title: action.title });
    }

    setApproving(false);
    saveLocalApproval(action);

    if (res?.success) {
      toast.success("Approved and action sent to Churvox.");
      setActiveAction(null);
      load();
    } else {
      toast.success("Approval recorded. Full action endpoint can be wired deeper next.");
      setActiveAction(null);
    }
  };

  const topActions = actions.length ? actions.slice(0, 6) : [
    { id: "empty-setup", type: "setup", title: "Create live data", meta: "Add jobs, invoices, quotes or workers so Churvox has real admin to prepare.", status: "next step", href: "/jobs/new", record: {} },
    { id: "empty-help", type: "support", title: "Need help setting up?", meta: "Use the help button or Support page to ask for setup help.", status: "ready", href: "/support", record: {} },
  ];

  return (
    <main className="min-h-screen bg-[#f5f2ea] p-4 pb-32 text-slate-950 md:p-6 md:pb-28 xl:pl-[320px]">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="overflow-hidden rounded-[32px] border border-slate-900 bg-slate-950 p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,.24)] md:p-8">
          <div className="inline-flex rounded-full border border-orange-300/25 bg-orange-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-orange-200">Command Board</div>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[.9] tracking-[-.08em] md:text-7xl">Churvox does the admin. You approve.</h1>
          <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">This is the owner command centre: urgent work, cash, crew, customer requests, prepared slips and exact approval actions in one place.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/jobs/new" className="rounded-2xl bg-orange-400 px-5 py-3 text-sm font-black text-slate-950 no-underline shadow-lg shadow-orange-400/20">Create job</Link>
            <Link to="/support" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline">Get help</Link>
            <a href="/request-work.html" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline">Customer request form</a>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Tile label="AI actions" value={loading ? "…" : actions.length || "OK"} text="Prepared admin and dispatch decisions waiting for owner approval." to="/ai-operator" />
          <Tile label="Today" value={todayJobs.length || "OK"} text={`${activeJobs.length} active job${activeJobs.length === 1 ? "" : "s"} right now.`} to="/jobs" />
          <Tile label="Cash" value={money(outstanding)} text={`${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"} found.`} to="/invoices" />
          <Tile label="Ready to invoice" value={completedReady.length || "OK"} text="Completed jobs not billed yet appear here." to="/invoices/new" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)]">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Owner approval queue</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-.06em] md:text-5xl">Prepared actions</h2>
              </div>
              {loading ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Loading…</span> : null}
            </div>
            <div className="grid gap-3">
              {topActions.map((action) => (
                <button key={action.id} type="button" onClick={() => setActiveAction(action)} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-orange-200 hover:bg-orange-50">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">{action.type.replaceAll("_", " ")}</div>
                      <h3 className="mt-1 text-xl font-black tracking-[-.04em] text-slate-950">{action.title}</h3>
                    </div>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-white">{action.status}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{action.meta}</p>
                </button>
              ))}
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)]">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">Top player layer</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Growth tools now visible.</h2>
              <div className="mt-4 grid gap-3">
                <a href="/request-work.html" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-900 no-underline">Customer request / booking</a>
                <a href="/customer-portal.html" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-900 no-underline">Customer portal preview</a>
                <a href="/review-engine.html" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-900 no-underline">Review & referral engine</a>
                <a href="/trust-center.html" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-900 no-underline">Trust / security centre</a>
              </div>
            </div>

            <div className="rounded-[30px] border border-orange-200 bg-orange-50 p-5">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-700">Setup path</div>
              <ol className="mt-3 space-y-2 text-sm font-black leading-6 text-orange-950">
                <li>1. Add business details</li>
                <li>2. Add first client</li>
                <li>3. Create first job</li>
                <li>4. Invite worker</li>
                <li>5. Create quote / invoice</li>
                <li>6. Add review link</li>
              </ol>
            </div>
          </aside>
        </section>
      </section>

      <ActionSlip action={activeAction} onClose={() => setActiveAction(null)} onApprove={approveAction} approving={approving} />
    </main>
  );
}

export default CommandDeskQueuePage;
