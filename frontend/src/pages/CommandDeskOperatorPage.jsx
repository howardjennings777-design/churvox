import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const darkCard = "cv-board-dark-card rounded-[30px] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_22px_62px_rgba(2,6,23,.24)]";

const first = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
const idOf = (item) => String(item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id || item?.worker_id || "");
const statusOf = (item) => String(first(item?.status, item?.job_status, item?.invoice_status, item?.quote_status, "")).toLowerCase();
const numberValue = (value) => Number(String(value || 0).replace(/[^0-9.-]/g, "")) || 0;

function listFrom(res, keys = []) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, "data", "items", "results", "jobs", "invoices", "quotes", "workers", "team", "users"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function isDone(job) {
  const status = statusOf(job);
  return status.includes("complete") || status.includes("done") || job?.completed === true || Boolean(job?.completed_at);
}

function isOverdue(invoice) {
  const status = statusOf(invoice);
  if (status.includes("paid")) return false;
  if (status.includes("overdue")) return true;
  const due = first(invoice?.due_date, invoice?.due_at);
  if (!due) return false;
  const date = new Date(due);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function isUnassigned(job) {
  return !isDone(job) && !first(job?.assigned_worker_id, job?.worker_id, job?.assigned_to, job?.assigned_worker_name, job?.worker_name);
}

function titleOf(job) {
  return first(job?.title, job?.job_title, job?.service_type, job?.job_type, "Untitled job");
}

function clientOf(item) {
  return first(item?.client_name, item?.customer_name, item?.client?.name, item?.name, "No client saved");
}

function workerName(worker) {
  return first(worker?.name, worker?.full_name, worker?.display_name, worker?.email, "Unnamed worker");
}

function pickWorker(job, workers) {
  const fieldWorkers = workers.filter((worker) => {
    const role = String(first(worker?.role, worker?.account_type, "worker")).toLowerCase();
    return role.includes("worker") || role.includes("field") || role.includes("manager");
  });
  return fieldWorkers[0] || null;
}

function makeActions({ jobs, invoices, quotes, workers }) {
  const actions = [];
  const invoicedJobs = new Set(invoices.map((invoice) => String(first(invoice.job_id, invoice.jobId, ""))).filter(Boolean));

  jobs.filter(isUnassigned).slice(0, 8).forEach((job) => {
    const worker = pickWorker(job, workers);
    actions.push({
      id: `assign-${idOf(job)}`,
      box: "crew",
      type: "assign_job",
      title: "Assign job",
      summary: worker ? `${workerName(worker)} looks like the best fit.` : "Choose a worker before approving.",
      ready: Boolean(idOf(job) && worker && idOf(worker)),
      form: {
        job_id: idOf(job),
        job_title: titleOf(job),
        client_name: clientOf(job),
        worker_id: worker ? idOf(worker) : "",
        worker_name: worker ? workerName(worker) : "",
      },
    });
  });

  jobs.filter((job) => isDone(job) && !invoicedJobs.has(idOf(job))).slice(0, 8).forEach((job) => {
    actions.push({
      id: `invoice-job-${idOf(job)}`,
      box: "jobs",
      type: "draft_invoice",
      title: "Create draft invoice",
      summary: "Completed job is ready to invoice.",
      ready: Boolean(idOf(job) && first(job.price, job.total, job.subtotal)),
      form: {
        job_id: idOf(job),
        client_id: first(job.client_id, job.customer_id),
        client_name: clientOf(job),
        customer_name: clientOf(job),
        customer_email: first(job.customer_email, job.client_email, job.email),
        subtotal: first(job.price, job.total, job.subtotal),
        description: first(job.invoice_description, job.description, job.notes, `${titleOf(job)} completed`),
      },
    });
  });

  invoices.filter((invoice) => statusOf(invoice).includes("draft")).slice(0, 6).forEach((invoice) => {
    actions.push({
      id: `send-invoice-${idOf(invoice)}`,
      box: "invoices",
      type: "send_invoice",
      title: "Send draft invoice",
      summary: "Draft invoice is ready to send after review.",
      ready: Boolean(idOf(invoice)),
      form: { invoice_id: idOf(invoice), client_name: clientOf(invoice), customer_email: first(invoice.customer_email, invoice.client_email, invoice.email) },
    });
  });

  invoices.filter(isOverdue).slice(0, 6).forEach((invoice) => {
    actions.push({
      id: `follow-invoice-${idOf(invoice)}`,
      box: "invoices",
      type: "invoice_follow_up",
      title: "Follow up invoice",
      summary: "Overdue invoice needs owner review.",
      ready: Boolean(idOf(invoice)),
      form: { invoice_id: idOf(invoice), client_name: clientOf(invoice), message: `Friendly reminder for ${clientOf(invoice)}.` },
    });
  });

  quotes.filter((quote) => statusOf(quote).includes("sent") && !quote.converted_job_id).slice(0, 6).forEach((quote) => {
    actions.push({
      id: `follow-quote-${idOf(quote)}`,
      box: "quotes",
      type: "quote_follow_up",
      title: "Follow up quote",
      summary: "Sent quote is ready for a polite follow-up.",
      ready: Boolean(idOf(quote)),
      form: { quote_id: idOf(quote), client_name: clientOf(quote), message: `Hi ${clientOf(quote)}, just checking whether you had any questions about your quote.` },
    });
  });

  quotes.filter((quote) => statusOf(quote).includes("accept") && !quote.converted_job_id).slice(0, 6).forEach((quote) => {
    actions.push({
      id: `convert-quote-${idOf(quote)}`,
      box: "quotes",
      type: "quote_convert",
      title: "Convert quote to job",
      summary: "Accepted quote can become a job.",
      ready: Boolean(idOf(quote)),
      form: { quote_id: idOf(quote), client_name: clientOf(quote) },
    });
  });

  return actions;
}

function Pill({ children, good }) {
  return <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] ${good ? "bg-emerald-300 text-slate-950" : "bg-amber-300 text-slate-950"}`}>{children}</span>;
}

function Metric({ label, value, text, tone }) {
  return (
    <article className={`${darkCard} relative overflow-hidden pl-7`}>
      <span className="absolute left-0 top-0 h-full w-2" style={{ background: `linear-gradient(180deg, ${tone}, #facc15, #22d3ee)` }} />
      <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div>
      <div className="mt-2 text-4xl font-black tracking-[-.07em] text-white">{value}</div>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p>
    </article>
  );
}

function ActionCard({ action, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(action)} className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-left text-white hover:bg-white/[0.09]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-black tracking-[-.04em] text-white">{action.title}</h3>
        <Pill good={action.ready}>{action.ready ? "Ready" : "Needs details"}</Pill>
      </div>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-300">{action.summary}</p>
      <div className="mt-4 inline-flex rounded-2xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Review slip</div>
    </button>
  );
}

function WorkBox({ label, title, count, text, href, tone, actions, empty, onOpen }) {
  return (
    <section className={`${darkCard} relative flex min-h-[320px] flex-col overflow-hidden pl-7`}>
      <span className="absolute left-0 top-0 h-full w-2" style={{ background: `linear-gradient(180deg, ${tone}, #facc15, #22d3ee)` }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div>
          <h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">{title}</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white ring-1 ring-white/10">{count}</span>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-300">{text}</p>
      <div className="mt-5 grid gap-3">
        {actions.length ? actions.slice(0, 3).map((action) => <ActionCard key={action.id} action={action} onOpen={onOpen} />) : <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-sm font-black leading-6 text-slate-300">{empty}</div>}
      </div>
      <div className="mt-auto pt-5">
        <Link to={href} className="inline-flex rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white no-underline">Open</Link>
      </div>
    </section>
  );
}

function Slip({ action, onClose, onApprove }) {
  const [form, setForm] = React.useState(action?.form || {});
  React.useEffect(() => setForm(action?.form || {}), [action]);
  if (!action) return null;
  const fields = Object.keys(form);

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-950/90 p-4">
      <section className="mx-auto max-w-5xl rounded-[34px] bg-[#f7f3ea] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-6">
          <div>
            <div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-orange-700">Approval slip</div>
            <h1 className="mt-3 text-4xl font-black tracking-[-.07em] text-slate-950">{action.title}</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{action.summary}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Close</button>
        </header>
        <main className="grid gap-5 p-5 md:grid-cols-[1fr_320px]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Review and edit</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {fields.map((key) => (
                <label key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{key.replaceAll("_", " ")}</span>
                  <input value={form[key] || ""} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950" />
                </label>
              ))}
            </div>
          </section>
          <aside className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-600">Owner action</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-slate-950">Approve when right.</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">Churvox prepares. You approve.</p>
            <div className="mt-5 grid gap-3">
              <button type="button" onClick={() => onApprove(action, form)} className="rounded-2xl bg-orange-400 px-4 py-3 text-sm font-black text-slate-950">Approve action</button>
              <button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Back</button>
            </div>
          </aside>
        </main>
      </section>
    </div>
  );
}

export default function CommandDeskOperatorPage() {
  const { get, post, patch } = useApi();
  const [data, setData] = React.useState({ jobs: [], invoices: [], quotes: [], workers: [] });
  const [actions, setActions] = React.useState([]);
  const [open, setOpen] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setBusy(true);
    try {
      const [jobsRes, invoicesRes, quotesRes, workersRes] = await Promise.allSettled([get("/jobs"), get("/invoices"), get("/quotes"), get("/team/workers")]);
      const next = {
        jobs: jobsRes.status === "fulfilled" ? listFrom(jobsRes.value, ["jobs"]) : [],
        invoices: invoicesRes.status === "fulfilled" ? listFrom(invoicesRes.value, ["invoices"]) : [],
        quotes: quotesRes.status === "fulfilled" ? listFrom(quotesRes.value, ["quotes"]) : [],
        workers: workersRes.status === "fulfilled" ? listFrom(workersRes.value, ["workers", "team", "users"]) : [],
      };
      setData(next);
      setActions(makeActions(next));
    } finally {
      setBusy(false);
    }
  }, [get]);

  React.useEffect(() => { refresh(); }, [refresh]);

  async function approve(action, form) {
    setBusy(true);
    try {
      let res = { success: true };
      if (action.type === "assign_job") res = await post(`/jobs/${form.job_id}/assign`, { worker_id: form.worker_id });
      if (action.type === "draft_invoice") res = await post("/invoices", { job_id: form.job_id, client_id: form.client_id || undefined, customer_name: form.customer_name || form.client_name, customer_email: form.customer_email || undefined, subtotal: numberValue(form.subtotal), description: form.description });
      if (action.type === "send_invoice") res = await post(`/invoices/${form.invoice_id}/send`, {});
      if (action.type === "invoice_follow_up") res = await patch(`/invoices/${form.invoice_id}`, { notes: `Follow-up reviewed ${new Date().toLocaleDateString()}: ${form.message || "Reminder reviewed"}` });
      if (action.type === "quote_follow_up") res = await patch(`/quotes/${form.quote_id}`, { notes: `Follow-up reviewed ${new Date().toLocaleDateString()}: ${form.message || "Reminder reviewed"}` });
      if (action.type === "quote_convert") res = await post(`/quotes/${form.quote_id}/convert`, {});
      if (!res?.success) throw new Error(res?.error || "Approval failed");
      toast.success("Approved and applied");
      setOpen(null);
      await refresh();
    } catch (error) {
      toast.error(error?.message || "Approval failed");
    } finally {
      setBusy(false);
    }
  }

  const jobActions = actions.filter((action) => action.box === "jobs");
  const invoiceActions = actions.filter((action) => action.box === "invoices");
  const quoteActions = actions.filter((action) => action.box === "quotes");
  const crewActions = actions.filter((action) => action.box === "crew");
  const ready = actions.filter((action) => action.ready).length;
  const needs = actions.length - ready;

  return (
    <main className="cv-command-board-offwhite fixed inset-0 z-[2147483000] overflow-y-auto text-slate-950" data-industrial-simple-page="command" data-command-canvas>
      <section className="mx-auto max-w-7xl p-4 pb-28 md:p-6 xl:p-8">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className={`${darkCard} p-6 md:p-8`}>
            <span className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Command Board</span>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Churvox does the admin. You approve.</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Separate boxes for jobs, invoices, quotes and crew — each with its own approval slips.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={refresh} disabled={busy} className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{busy ? "Checking…" : "Review AI actions"}</button>
              <Link to="/jobs/new" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline">Create job</Link>
            </div>
          </section>
          <section className={darkCard}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">AI priority</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">{ready ? `${ready} ready` : needs ? `${needs} need details` : "All clear"}</h2>
              </div>
              <Pill good={!ready}>{ready ? "Next" : "OK"}</Pill>
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-300">Nothing is assigned, sent, created or converted without approval.</p>
          </section>
        </section>

        <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Jobs" value={data.jobs.length} text="Jobs checked." tone="#facc15" />
          <Metric label="Invoices" value={data.invoices.length} text="Invoices checked." tone="#34d399" />
          <Metric label="Quotes" value={data.quotes.length} text="Quotes checked." tone="#22d3ee" />
          <Metric label="Approvals" value={actions.length} text="Prepared slips." tone="#fb923c" />
        </section>

        <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <WorkBox label="Jobs" title="Jobs needing admin" count={jobActions.length} text="Completed jobs and job admin prepared for review." href="/jobs-board" tone="#facc15" actions={jobActions} empty="No job admin actions right now." onOpen={setOpen} />
          <WorkBox label="Invoices" title="Money waiting" count={invoiceActions.length} text="Draft, overdue, and ready-to-send invoice actions." href="/invoices-board" tone="#34d399" actions={invoiceActions} empty="No invoice actions right now." onOpen={setOpen} />
          <WorkBox label="Quotes" title="Quotes to chase" count={quoteActions.length} text="Quote follow-ups and accepted quotes to convert." href="/quotes-board" tone="#22d3ee" actions={quoteActions} empty="No quote actions right now." onOpen={setOpen} />
          <WorkBox label="Crew" title="Crew Dispatch" count={crewActions.length} text="Unassigned jobs and worker assignment suggestions." href="/dispatch-board" tone="#fb923c" actions={crewActions} empty="No crew actions right now." onOpen={setOpen} />
        </section>
      </section>
      {open ? <Slip action={open} onClose={() => setOpen(null)} onApprove={approve} /> : null}
    </main>
  );
}
