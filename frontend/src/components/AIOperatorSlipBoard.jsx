import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const pick = (...v) => v.find((x) => x !== undefined && x !== null && String(x).trim() !== "") || "";
const low = (v) => String(v || "").toLowerCase();
const idOf = (x) => String((typeof (x?.id || x?._id) === "object" ? (x?.id || x?._id)?.$oid : (x?.id || x?._id || x?.job_id || x?.invoice_id || x?.quote_id || x?.client_id || x?.user_id)) || "");
const titleOf = (x) => pick(x?.title, x?.job_name, x?.invoice_number, x?.quote_number, x?.client_name, x?.customer_name, x?.name, "Record");
const statusOf = (x) => pick(x?.status, x?.job_status, x?.invoice_status, x?.quote_status, "ready").replaceAll("_", " ");
const clientOf = (x) => pick(x?.client_name, x?.customer_name, x?.name, "No client saved");
const addressOf = (x) => pick(x?.site_address, x?.job_address, x?.address, x?.billing_address, "No address saved");
const amountOf = (x) => Number(pick(x?.amount_due, x?.balance_due, x?.total, x?.amount, x?.price, x?.fixed_price, 0)) || 0;
const money = (v) => (Number(v || 0) > 0 ? Number(v).toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0");

function listFrom(res) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const k of ["jobs", "invoices", "quotes", "clients", "workers", "team", "items", "results", "data"]) if (Array.isArray(data?.[k])) return data[k];
  return [];
}

function workerName(w) { return pick(w?.name, w?.full_name, w?.display_name, w?.email, "Crew member"); }
function assignedWorker(j) { return pick(j?.assigned_worker_name, j?.worker_name, j?.assignee_name, j?.assigned_to_name, j?.assigned_to, j?.staff_name); }
function completed(j) { const s = low(statusOf(j)); return s.includes("complete") || s.includes("done") || j?.completed || j?.completed_at; }
function cancelled(j) { const s = low(statusOf(j)); return s.includes("cancel") || s.includes("archiv"); }
function active(j) { const s = low(statusOf(j)); return s.includes("progress") || s.includes("active") || s.includes("started"); }
function hasInvoice(j) { return Boolean(pick(j?.invoice_id, j?.linked_invoice_id, j?.invoice_number, j?.invoice_status)); }
function overdue(i) { return low(statusOf(i)).includes("overdue") || Number(i?.days_overdue || 0) > 0; }
function quoteFollow(q) { const s = low(statusOf(q)); return (s.includes("sent") || s.includes("pending") || s.includes("draft")) && !q?.follow_up_approved_at; }
function dueDate(days = 7) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

function buildSlips({ jobs = [], invoices = [], quotes = [], workers = [] }) {
  const available = workers.filter((w) => !low(statusOf(w)).includes("busy") && !low(statusOf(w)).includes("inactive"));
  const slips = [];

  jobs.filter((j) => !assignedWorker(j) && !completed(j) && !cancelled(j)).slice(0, 3).forEach((job, i) => {
    const worker = available[i % Math.max(available.length, 1)];
    slips.push({ type: "assign", id: `assign-${idOf(job)}`, title: `Assign ${titleOf(job)}`, prepared: worker ? `Churvox picked ${workerName(worker)} as the best available person to review.` : "Churvox found this job has no person assigned.", reason: "The job is open and unassigned.", record: job, worker, href: `/jobs/${idOf(job)}`, edit: `/jobs/${idOf(job)}/edit`, approve: worker ? "Approve assignment" : "Review", facts: [["Client", clientOf(job)], ["Address", addressOf(job)], ["Status", statusOf(job)], ["Prepared person", worker ? workerName(worker) : "No available worker"]] });
  });

  jobs.filter((j) => completed(j) && !hasInvoice(j)).slice(0, 3).forEach((job) => {
    slips.push({ type: "invoice", id: `invoice-${idOf(job)}`, title: `Draft invoice for ${titleOf(job)}`, prepared: "Churvox prepared the invoice source from the completed job.", reason: "Completed work has no linked invoice.", record: job, href: `/jobs/${idOf(job)}`, edit: `/invoices/new?job_id=${idOf(job)}`, approve: "Approve draft invoice", facts: [["Client", clientOf(job)], ["Job", titleOf(job)], ["Amount", money(amountOf(job))], ["Description", pick(job?.ai_invoice_description, job?.completion_notes, job?.notes, "Service work completed")]] });
  });

  invoices.filter((i) => overdue(i) && !low(statusOf(i)).includes("paid")).slice(0, 3).forEach((invoice) => {
    slips.push({ type: "overdue", id: `overdue-${idOf(invoice)}`, title: `Follow up ${titleOf(invoice)}`, prepared: "Churvox prepared an overdue follow-up note.", reason: "Invoice is overdue or has overdue days recorded.", record: invoice, href: `/invoices/${idOf(invoice)}`, edit: `/invoices/${idOf(invoice)}/edit`, approve: "Approve follow-up", facts: [["Client", clientOf(invoice)], ["Amount due", money(amountOf(invoice))], ["Due", pick(invoice?.due_date, "No due date")], ["Status", statusOf(invoice)]] });
  });

  quotes.filter(quoteFollow).slice(0, 3).forEach((quote) => {
    slips.push({ type: "quote", id: `quote-${idOf(quote)}`, title: `Follow up quote for ${clientOf(quote)}`, prepared: "Churvox prepared a quote follow-up for owner approval.", reason: "Quote is still open and may go cold.", record: quote, href: `/quotes/${idOf(quote)}`, edit: `/quotes/${idOf(quote)}/edit`, approve: "Approve follow-up", facts: [["Client", clientOf(quote)], ["Quote", titleOf(quote)], ["Value", money(amountOf(quote))], ["Status", statusOf(quote)]] });
  });

  jobs.filter((j) => active(j) && assignedWorker(j)).slice(0, 2).forEach((job) => {
    slips.push({ type: "check", id: `check-${idOf(job)}`, title: `${assignedWorker(job)} is on ${titleOf(job)}`, prepared: "Churvox prepared a live job check.", reason: "Job is active, so owner may need time, note, photo or completion review.", record: job, href: `/jobs/${idOf(job)}`, edit: `/jobs/${idOf(job)}/edit`, approve: "Mark checked", facts: [["Worker", assignedWorker(job)], ["Client", clientOf(job)], ["Address", addressOf(job)], ["Status", statusOf(job)]] });
  });

  return slips.slice(0, 8);
}

export default function AIOperatorSlipBoard({ initialData = {}, needs = 0 }) {
  const api = useApi();
  const [data, setData] = React.useState(initialData);
  const [busy, setBusy] = React.useState("");
  const [hidden, setHidden] = React.useState([]);
  React.useEffect(() => setData(initialData || {}), [initialData]);

  async function refresh() {
    const [j, i, q, w] = await Promise.allSettled([api.get("/jobs"), api.get("/invoices"), api.get("/quotes"), api.get("/team/workers")]);
    const read = (r) => r.status === "fulfilled" && r.value?.success ? listFrom(r.value) : [];
    setData({ jobs: read(j), invoices: read(i), quotes: read(q), workers: read(w) });
  }

  async function approve(slip) {
    const id = idOf(slip.record);
    if (!id) return toast.error("No record ID found");
    setBusy(slip.id);
    const now = new Date().toISOString();
    let res = null;
    if (slip.type === "assign" && slip.worker) {
      const workerId = idOf(slip.worker);
      res = await api.patch(`/jobs/${id}`, { assigned_worker_id: workerId, assigned_to: workerId, assigned_worker_name: workerName(slip.worker), worker_name: workerName(slip.worker), status: "assigned", ai_operator_approved_at: now });
    } else if (slip.type === "invoice") {
      const subtotal = amountOf(slip.record);
      const gst = subtotal * 0.15;
      const total = subtotal + gst;
      res = await api.post("/invoices", { linked_job_id: id, job_id: id, customer_name: clientOf(slip.record), client_name: clientOf(slip.record), address: addressOf(slip.record), site_address: addressOf(slip.record), description: pick(slip.record?.ai_invoice_description, slip.record?.completion_notes, slip.record?.notes, "Service work completed"), invoice_number: `INV-${Date.now().toString().slice(-6)}`, due_date: dueDate(7), status: "draft", line_items: [{ description: titleOf(slip.record), quantity: 1, qty: 1, unit_price: subtotal, rate: subtotal, amount: subtotal }], subtotal, gst_amount: gst, tax_amount: gst, total, amount: total, amount_due: total, balance_due: total, ai_operator_created: true, ai_operator_approved_at: now });
    } else if (slip.type === "overdue") {
      res = await api.patch(`/invoices/${id}`, { follow_up_status: "approved", reminder_approved_at: now, ai_operator_note: `Follow-up approved for ${money(amountOf(slip.record))} outstanding.` });
    } else if (slip.type === "quote") {
      res = await api.patch(`/quotes/${id}`, { follow_up_status: "approved", follow_up_approved_at: now, ai_operator_note: `Follow-up approved for ${clientOf(slip.record)}.` });
    } else {
      res = await api.patch(`/jobs/${id}`, { ai_operator_checked_at: now });
    }
    setBusy("");
    if (!res?.success) return toast.error(res?.error || "Could not approve slip");
    toast.success("Churvox completed the prepared action");
    setHidden((x) => [...x, slip.id]);
    refresh();
  }

  const slips = buildSlips(data).filter((s) => !hidden.includes(s.id));

  return (
    <section data-cv-command-tile="true" className="cv-command-tile relative min-h-[280px] overflow-hidden rounded-[28px] border border-white/10 p-4 pl-7 text-white" style={{ background: "linear-gradient(135deg,#111827,#070d16)", boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)" }}>
      <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: "repeating-linear-gradient(135deg,#22d3ee 0 10px,rgba(255,255,255,.30) 10px 15px,#22d3ee 15px 25px)", boxShadow: "0 0 18px #22d3ee66" }} />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">AI Operator slips</div><h2 className="mt-1 text-2xl font-black leading-none tracking-[-0.06em] text-white">Churvox prepared this</h2><p className="mt-2 text-xs font-bold leading-5 text-slate-300">Real admin found from jobs, invoices, quotes and crew. Approve it, edit it, or open the full record.</p></div>
        <div className="shrink-0 rounded-2xl bg-cyan-300/15 px-3 py-1.5 text-2xl font-black text-white ring-1 ring-cyan-300/25">{slips.length || needs}</div>
      </div>
      <div className="grid max-h-[640px] gap-3 overflow-auto pr-1">
        {slips.length ? slips.map((slip) => <article key={slip.id} className="rounded-[22px] border border-white/10 bg-white/[.07] p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">{slip.reason}</div><h3 className="mt-1 text-lg font-black leading-tight tracking-[-0.045em] text-white">{slip.title}</h3></div><button type="button" onClick={() => setHidden((x) => [...x, slip.id])} className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-slate-300">Dismiss</button></div><p className="mt-2 text-xs font-bold leading-5 text-slate-300">{slip.prepared}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{slip.facts.map(([label, value]) => <div key={label} className="rounded-2xl bg-black/20 p-2"><span className="block text-[9px] font-black uppercase tracking-[.14em] text-amber-300">{label}</span><b className="mt-1 block text-xs leading-4 text-white">{String(value || "Not saved")}</b></div>)}</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => approve(slip)} disabled={busy === slip.id} className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50">{busy === slip.id ? "Working…" : slip.approve}</button><a href={slip.edit} className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white no-underline">Edit</a><a href={slip.href} className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white no-underline">Open details</a></div></article>) : <div className="rounded-[22px] border border-white/10 bg-white/[.07] p-4"><h3 className="text-lg font-black text-white">No urgent slips right now.</h3><p className="mt-2 text-sm font-bold text-slate-300">Churvox checked jobs, invoices, quotes and crew. Nothing needs approval at this moment.</p></div>}
      </div>
    </section>
  );
}
