import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumCard, PremiumHero, PremiumPage, PremiumButton } from "../components/premium";
import { CheckCircle, FileText, Receipt, RefreshCw, Send, Workflow } from "lucide-react";
import { toast } from "sonner";
import "./PipelinePage.css";

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function idOf(value) {
  return String(value?.id || value?._id || "");
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}

function titleOf(record, fallback) {
  return record?.title || record?.job_name || record?.customer_name || record?.client_name || record?.invoice_number || record?.quote_number || fallback;
}

function RecordRow({ record, type, actionLabel, onAction, openTo }) {
  return (
    <div className="cv-pipeline-row">
      <div>
        <b>{titleOf(record, type)}</b>
        <span>{record.status || "open"} · {record.address || record.site_address || record.customer_email || record.client_name || ""}</span>
      </div>
      <strong>{money(record.total || record.price || record.job_price || record.amount_due || record.subtotal)}</strong>
      <div className="cv-pipeline-actions">
        {openTo ? <Link to={openTo}>Open</Link> : null}
        {onAction ? <button type="button" onClick={() => onAction(record)}>{actionLabel}</button> : null}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const api = useApi();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  async function loadPipeline() {
    setLoading(true);
    const res = await api.get("/pipeline");
    if (res.success) setPipeline(res.data?.pipeline || {});
    else toast.error(res.error || "Could not load pipeline");
    setLoading(false);
  }

  useEffect(() => { loadPipeline(); }, []);

  const metrics = pipeline?.metrics || {};
  const acceptedQuotes = arr(pipeline?.accepted_quotes_no_job);
  const completedJobs = arr(pipeline?.completed_jobs_no_invoice);
  const draftInvoices = arr(pipeline?.draft_invoices);
  const sentInvoices = arr(pipeline?.sent_invoices);
  const overdueInvoices = arr(pipeline?.overdue_invoices);
  const paidInvoices = arr(pipeline?.paid_invoices);

  const stageCards = useMemo(() => [
    ["Accepted quotes", acceptedQuotes.length, "Need converting to jobs"],
    ["Completed jobs", completedJobs.length, "Need invoice drafts"],
    ["Draft invoices", draftInvoices.length, "Need owner approval/send"],
    ["Sent invoices", sentInvoices.length, "Waiting for payment"],
    ["Overdue invoices", overdueInvoices.length, money(metrics.overdue_total), "danger"],
    ["Paid invoices", paidInvoices.length, "Money tracked"],
  ], [acceptedQuotes.length, completedJobs.length, draftInvoices.length, sentInvoices.length, overdueInvoices.length, paidInvoices.length, metrics.overdue_total]);

  async function run(label, fn) {
    setBusy(label);
    const res = await fn();
    setBusy("");
    if (res.success) {
      toast.success("Pipeline updated");
      await loadPipeline();
      return res;
    }
    toast.error(res.error || "Pipeline action failed");
    return res;
  }

  async function convertQuote(quote) {
    const res = await run("quote", () => api.post(`/quotes/${idOf(quote)}/convert-to-job`, {}));
    const jobId = res?.data?.job_id || res?.data?.job?.id;
    if (jobId) navigate(`/jobs/${jobId}`);
  }

  async function invoiceJob(job) {
    const res = await run("job", () => api.post(`/jobs/${idOf(job)}/create-invoice-draft`, {}));
    const invoiceId = res?.data?.invoice_id || res?.data?.invoice?.id;
    if (invoiceId) navigate(`/invoices/${invoiceId}`);
  }

  async function approveInvoice(invoice) {
    await run("approve", () => api.post(`/invoices/${idOf(invoice)}/approve`));
  }

  async function markPaid(invoice) {
    await run("paid", () => api.post(`/invoices/${idOf(invoice)}/mark-paid-pipeline`));
  }

  return (
    <PremiumPage maxWidth={1180}>
      <PremiumHero
        eyebrow="Quote → Job → Invoice → Paid"
        title="The whole money pipeline in one place."
        subtitle="Convert accepted quotes, invoice completed jobs, approve drafts and track paid/overdue invoices without hunting across pages."
        icon={<Workflow className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadPipeline} disabled={loading || Boolean(busy)}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-pipeline-metrics">
        {stageCards.map(([label, value, note, tone]) => (
          <article key={label} className={tone === "danger" ? "danger" : ""}>
            <span>{label}</span>
            <b>{value}</b>
            <small>{note}</small>
          </article>
        ))}
      </section>

      <section className="cv-pipeline-money">
        <div><span>Ready to invoice</span><b>{money(metrics.ready_to_invoice_total)}</b></div>
        <div><span>Unpaid total</span><b>{money(metrics.unpaid_total)}</b></div>
        <div><span>Overdue total</span><b>{money(metrics.overdue_total)}</b></div>
      </section>

      {loading ? (
        <PremiumCard><div className="cv-pipeline-empty">Loading pipeline…</div></PremiumCard>
      ) : (
        <section className="cv-pipeline-grid">
          <PremiumCard title="1. Accepted quotes needing jobs" icon={<FileText className="h-5 w-5" />}>
            {acceptedQuotes.length ? acceptedQuotes.map((quote) => (
              <RecordRow key={idOf(quote)} record={quote} type="Quote" openTo={`/quotes/${idOf(quote)}`} actionLabel="Convert to job" onAction={convertQuote} />
            )) : <div className="cv-pipeline-empty">No accepted quotes waiting for jobs.</div>}
          </PremiumCard>

          <PremiumCard title="2. Completed jobs needing invoices" icon={<Send className="h-5 w-5" />}>
            {completedJobs.length ? completedJobs.map((job) => (
              <RecordRow key={idOf(job)} record={job} type="Job" openTo={`/jobs/${idOf(job)}`} actionLabel="Create draft invoice" onAction={invoiceJob} />
            )) : <div className="cv-pipeline-empty">No completed jobs waiting for invoices.</div>}
          </PremiumCard>

          <PremiumCard title="3. Draft invoices needing owner approval" icon={<Receipt className="h-5 w-5" />}>
            {draftInvoices.length ? draftInvoices.map((invoice) => (
              <RecordRow key={idOf(invoice)} record={invoice} type="Invoice" openTo={`/invoices/${idOf(invoice)}`} actionLabel="Approve" onAction={approveInvoice} />
            )) : <div className="cv-pipeline-empty">No draft invoices waiting.</div>}
          </PremiumCard>

          <PremiumCard title="4. Sent and overdue invoices" icon={<CheckCircle className="h-5 w-5" />}>
            {[...overdueInvoices, ...sentInvoices].length ? [...overdueInvoices, ...sentInvoices].map((invoice) => (
              <RecordRow key={idOf(invoice)} record={invoice} type="Invoice" openTo={`/invoices/${idOf(invoice)}`} actionLabel="Mark paid" onAction={markPaid} />
            )) : <div className="cv-pipeline-empty">No unpaid invoices waiting.</div>}
          </PremiumCard>
        </section>
      )}
    </PremiumPage>
  );
}
